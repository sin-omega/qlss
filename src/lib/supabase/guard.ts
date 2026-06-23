import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * API guard: returns a 503 NextResponse when Supabase is not configured, or
 * null when it is (so the caller can proceed). Mirrors the pattern already
 * used by /api/shorten.
 *
 * @example
 * export async function GET() {
 *   const guard = apiSupabaseGuard();
 *   if (guard) return guard;
 *   ...
 * }
 */
export function apiSupabaseGuard(): NextResponse | null {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }
  return null;
}
