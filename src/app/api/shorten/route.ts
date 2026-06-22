import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import {
  normalizeSlug,
  isValidSlug,
  isReservedSlug,
} from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const SLUG_LENGTH = 6;

interface CreateLinkBody {
  destination_url?: string;
  custom_slug?: string;
  title?: string;
  description?: string;
  pincode?: string;
  expires_in?: number;
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

  const destinationUrl = (body.destination_url ?? "").trim();
  if (!destinationUrl) {
    return jsonError(400, "destination_url is required.");
  }

  let destination: URL;
  try {
    destination = new URL(destinationUrl);
  } catch {
    return jsonError(400, "Invalid destination URL.");
  }
  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    return jsonError(400, "Only http(s) destinations are allowed.");
  }

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

  const rawPincode = (body.pincode ?? "").trim();
  if (rawPincode.length > 32) {
    return jsonError(400, "Pincode must be 32 chars or fewer.");
  }

  // Accept expires_in — to be implemented with Supabase integration
  const rawExpiresIn = body.expires_in;
  if (rawExpiresIn !== undefined && rawExpiresIn !== null) {
    if (typeof rawExpiresIn !== "number" || rawExpiresIn <= 0) {
      return jsonError(400, "expires_in must be a positive number (seconds).");
    }
    // TODO: store expires_in in the link record when Supabase is connected
    void rawExpiresIn;
  }

  const rawTitle = (body.title ?? "").trim();
  const rawDescription = (body.description ?? "").trim();
  if (rawTitle.length > 140) {
    return jsonError(400, "Title must be 140 chars or fewer.");
  }
  if (rawDescription.length > 500) {
    return jsonError(400, "Description must be 500 chars or fewer.");
  }

  const { data, error } = await serviceClient
    .from("links")
    .insert({
      user_id: user?.id ?? null,
      slug,
      destination_url: destination.toString(),
      title: rawTitle || null,
      description: rawDescription || null,
      pincode: rawPincode || null,
    })
    .select("id, slug, destination_url, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      if (requestedSlug) {
        return jsonError(409, "That alias is already taken. Try another.");
      }
      const slug2 = generateSlug();
      const { data: data2, error: error2 } = await serviceClient
        .from("links")
        .insert({
          user_id: user?.id ?? null,
          slug: slug2,
          destination_url: destination.toString(),
          pincode: rawPincode || null,
        })
        .select("id, slug, destination_url, created_at")
        .single();
      if (error2) {
        console.warn("[shorten] retry insert failed:", error2.message);
        return jsonError(500, "Could not create the link. Try again.");
      }
      return NextResponse.json({
        slug: data2.slug,
        short_url: `${siteOrigin()}/${data2.slug}`,
        destination_url: data2.destination_url,
        created_at: data2.created_at,
        owner: Boolean(user),
      });
    }
    console.warn("[shorten] insert failed:", error.message);
    return jsonError(500, "Could not create the link. Try again.");
  }

  return NextResponse.json({
    slug: data.slug,
    short_url: `${siteOrigin()}/${data.slug}`,
    destination_url: data.destination_url,
    created_at: data.created_at,
    owner: Boolean(user),
  });
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
