import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

interface OnboardBody {
  username?: string;
  tos_accepted?: boolean;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: OnboardBody;
  try {
    body = (await request.json()) as OnboardBody;
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with `username`." },
      { status: 400 },
    );
  }

  // ── ToS acceptance (required) ──────────────────────────────────────────
  if (!body.tos_accepted) {
    return NextResponse.json(
      { error: "You must accept the Terms of Service and Privacy Policy to continue." },
      { status: 400 },
    );
  }

  // ── Username validation ────────────────────────────────────────────────
  const username = (body.username ?? "").trim();
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3–30 characters: letters, numbers, and underscores only.",
      },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Banned username check
  const { data: banned } = await service
    .from("banned_usernames")
    .select("username")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (banned) {
    return NextResponse.json(
      { error: "That username is reserved. Please choose another." },
      { status: 409 },
    );
  }

  // Also block obvious reserved words even if not seeded in the table
  const RESERVED = new Set([
    "admin", "administrator", "root", "system", "official", "qlss",
    "support", "help", "info", "contact", "api", "moderator", "mod",
    "null", "undefined", "true", "false",
  ]);
  if (RESERVED.has(username.toLowerCase())) {
    return NextResponse.json(
      { error: "That username is reserved. Please choose another." },
      { status: 409 },
    );
  }

  // Uniqueness check (case-insensitive)
  const { data: existing } = await service
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "That username is already taken. Try another." },
      { status: 409 },
    );
  }

  // ── Upsert profile ─────────────────────────────────────────────────────
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    const { error } = await service
      .from("profiles")
      .update({
        username,
        tos_accepted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken. Try another." },
          { status: 409 },
        );
      }
      console.warn("[onboard] update failed:", error.message);
      return NextResponse.json(
        { error: "Could not save your username. Try again." },
        { status: 500 },
      );
    }
  } else {
    const { error } = await service.from("profiles").insert({
      id: user.id,
      username,
      tos_accepted: true,
      is_admin: false,
      banned: false,
    });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken. Try another." },
          { status: 409 },
        );
      }
      console.warn("[onboard] insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save your username. Try again." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, username });
}
