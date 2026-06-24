import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import {
  normalizeSlug,
  isValidSlug,
  isReservedSlug,
  isBannedSlug,
} from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const SLUG_LENGTH = 6;

const VALID_LINK_TYPES = new Set(["redirect", "markdown"]);

interface CreateLinkBody {
  destination_url?: string;
  custom_slug?: string;
  title?: string;
  description?: string;
  pincode?: string;
  expires_in?: number;
  expires_at?: string;
  max_uses?: number;
  link_type?: string;
  markdown_content?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  allow_comments?: boolean;
  bulk?: string[];
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();

  let body: CreateLinkBody;
  try {
    body = (await request.json()) as CreateLinkBody;
  } catch {
    return jsonError(400, "Send a JSON body with `destination_url`.");
  }

  // ── Bulk mode ─────────────────────────────────────────────────────────
  if (Array.isArray(body.bulk) && body.bulk.length > 0) {
    if (!user) {
      return jsonError(401, "Sign in to use bulk shortening.");
    }
    return handleBulk(serviceClient, user.id, body);
  }

  const linkType = (body.link_type ?? "redirect").trim().toLowerCase();
  if (!VALID_LINK_TYPES.has(linkType)) {
    return jsonError(400, "link_type must be 'redirect' or 'markdown'.");
  }

  // ── Markdown content (required for markdown links) ────────────────────
  const markdownContent = (body.markdown_content ?? "").trim();
  if (linkType === "markdown" && markdownContent.length === 0) {
    return jsonError(400, "markdown_content is required for markdown links.");
  }
  if (markdownContent.length > 100_000) {
    return jsonError(400, "markdown_content must be 100,000 chars or fewer.");
  }

  // ── Destination URL (required for redirect links; optional for markdown) ──
  const destinationUrl = (body.destination_url ?? "").trim();
  if (linkType === "redirect") {
    if (!destinationUrl) {
      return jsonError(400, "destination_url is required.");
    }
  }

  let resolvedDestination = "";
  if (linkType === "redirect") {
    let rawUrl = destinationUrl;
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = `https://${rawUrl}`;
    }
    let destination: URL;
    try {
      destination = new URL(rawUrl);
    } catch {
      return jsonError(400, "Invalid destination URL.");
    }
    if (destination.protocol !== "http:" && destination.protocol !== "https:") {
      return jsonError(400, "Only http(s) destinations are allowed.");
    }
    if (
      !destination.hostname ||
      destination.hostname === "localhost" ||
      !destination.hostname.includes(".")
    ) {
      return jsonError(400, "That doesn't look like a valid URL.");
    }
    resolvedDestination = destination.toString();
  } else {
    // Markdown links: store the page's own URL as a harmless self-reference.
    // The [slug] resolver renders markdown_content and never redirects here.
    resolvedDestination = `${siteOrigin()}/`;
  }

  // ── Slug ──────────────────────────────────────────────────────────────
  const requestedSlug = normalizeSlug(body.custom_slug ?? "");
  let slug: string;

  if (requestedSlug) {
    if (!user) {
      return jsonError(401, "Sign in to use a custom alias.");
    }
    if (!isValidSlug(requestedSlug)) {
      return jsonError(
        400,
        "Custom alias can only contain lowercase letters, numbers and hyphens (3–32 chars).",
      );
    }
    if (isReservedSlug(requestedSlug)) {
      return jsonError(400, "That alias is reserved. Try another.");
    }
    if (await isBannedSlug(requestedSlug, serviceClient)) {
      return jsonError(400, "That alias is not allowed. Try another.");
    }
    const { data: existing } = await serviceClient
      .from("links")
      .select("slug")
      .eq("slug", requestedSlug)
      .maybeSingle();
    if (existing) {
      return jsonError(409, "That alias is already taken. Try another.");
    }
    slug = requestedSlug;
  } else {
    slug = generateSlug();
  }

  // ── Pincode ───────────────────────────────────────────────────────────
  const rawPincode = (body.pincode ?? "").trim();
  if (rawPincode.length > 32) {
    return jsonError(400, "Pincode must be 32 chars or fewer.");
  }

  // ── Expiry ────────────────────────────────────────────────────────────
  let expiresAt: string | null = null;
  if (body.expires_at) {
    const parsed = new Date(body.expires_at);
    if (Number.isNaN(parsed.getTime())) {
      return jsonError(400, "expires_at must be a valid ISO 8601 timestamp.");
    }
    if (parsed.getTime() <= Date.now()) {
      return jsonError(400, "expires_at must be in the future.");
    }
    expiresAt = parsed.toISOString();
  } else if (body.expires_in !== undefined && body.expires_in !== null) {
    if (typeof body.expires_in !== "number" || body.expires_in <= 0) {
      return jsonError(400, "expires_in must be a positive number (seconds).");
    }
    expiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();
  }

  // ── Max uses ──────────────────────────────────────────────────────────
  let maxUses: number | null = null;
  if (body.max_uses !== undefined && body.max_uses !== null) {
    if (
      typeof body.max_uses !== "number" ||
      !Number.isInteger(body.max_uses) ||
      body.max_uses <= 0
    ) {
      return jsonError(400, "max_uses must be a positive integer.");
    }
    maxUses = body.max_uses;
  }

  // ── Title / description / OG meta ─────────────────────────────────────
  const rawTitle = (body.title ?? "").trim();
  const rawDescription = (body.description ?? "").trim();
  if (rawTitle.length > 140) {
    return jsonError(400, "Title must be 140 chars or fewer.");
  }
  if (rawDescription.length > 500) {
    return jsonError(400, "Description must be 500 chars or fewer.");
  }
  const ogTitle = (body.og_title ?? "").trim().slice(0, 140) || null;
  const ogDescription = (body.og_description ?? "").trim().slice(0, 500) || null;
  const ogImage = (body.og_image ?? "").trim().slice(0, 2000) || null;
  const allowComments = body.allow_comments === true;
  if (ogImage) {
    try {
      const u = new URL(ogImage);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return jsonError(400, "og_image must be an http(s) URL.");
      }
    } catch {
      return jsonError(400, "og_image must be a valid URL.");
    }
  }

  const insertRow = {
    user_id: user?.id ?? null,
    slug,
    destination_url: resolvedDestination,
    title: rawTitle || null,
    description: rawDescription || null,
    pincode: rawPincode || null,
    expires_at: expiresAt,
    max_uses: maxUses,
    use_count: 0,
    link_type: linkType,
    markdown_content: linkType === "markdown" ? markdownContent : null,
    og_title: ogTitle,
    og_description: ogDescription,
    og_image: ogImage,
    allow_comments: allowComments,
  };

  const { data, error } = await serviceClient
    .from("links")
    .insert(insertRow)
    .select("id, slug, destination_url, created_at, link_type, expires_at, max_uses")
    .single();

  if (error) {
    if (error.code === "23505") {
      if (requestedSlug) {
        return jsonError(409, "That alias is already taken. Try another.");
      }
      // Collision on random slug — retry once
      const slug2 = generateSlug();
      const { data: data2, error: error2 } = await serviceClient
        .from("links")
        .insert({ ...insertRow, slug: slug2 })
        .select("id, slug, destination_url, created_at, link_type, expires_at, max_uses")
        .single();
      if (error2) {
        console.warn("[shorten] retry insert failed:", error2.message);
        return jsonError(500, "Could not create the link. Try again.");
      }
      return NextResponse.json(buildResponse(data2, user));
    }
    console.warn("[shorten] insert failed:", error.message);
    return jsonError(500, "Could not create the link. Try again.");
  }

  return NextResponse.json(buildResponse(data, user));
}

function buildResponse(
  data: {
    slug: string;
    destination_url: string;
    created_at: string;
    link_type?: string;
    expires_at?: string | null;
    max_uses?: number | null;
  },
  user: { id: string } | null,
) {
  return {
    slug: data.slug,
    short_url: `${siteOrigin()}/${data.slug}`,
    destination_url: data.destination_url,
    created_at: data.created_at,
    link_type: data.link_type ?? "redirect",
    expires_at: data.expires_at ?? null,
    max_uses: data.max_uses ?? null,
    owner: Boolean(user),
  };
}

async function handleBulk(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  body: CreateLinkBody,
) {
  const urls = body.bulk!
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .slice(0, 200);

  if (urls.length === 0) {
    return jsonError(400, "No URLs provided.");
  }

  const results: Array<{
    input: string;
    ok: boolean;
    slug?: string;
    short_url?: string;
    error?: string;
  }> = [];

  for (const raw of urls) {
    try {
      let withProto = raw;
      if (!withProto.startsWith("http://") && !withProto.startsWith("https://")) {
        withProto = `https://${withProto}`;
      }
      const dest = new URL(withProto);
      if (dest.protocol !== "http:" && dest.protocol !== "https:") {
        results.push({ input: raw, ok: false, error: "Only http(s) URLs." });
        continue;
      }
      const slug = generateSlug();
      const { data, error } = await serviceClient
        .from("links")
        .insert({
          user_id: userId,
          slug,
          destination_url: dest.toString(),
          link_type: "redirect",
          use_count: 0,
        })
        .select("slug, destination_url, created_at")
        .single();
      if (error) {
        results.push({ input: raw, ok: false, error: error.message });
        continue;
      }
      results.push({
        input: raw,
        ok: true,
        slug: data.slug,
        short_url: `${siteOrigin()}/${data.slug}`,
      });
    } catch {
      results.push({ input: raw, ok: false, error: "Invalid URL." });
    }
  }

  return NextResponse.json({ results });
}

function generateSlug(): string {
  let out = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return out;
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
