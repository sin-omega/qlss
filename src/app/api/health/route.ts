import { NextResponse } from "next/server";
import { isSupabaseConfigured, isServiceRoleConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Lightweight readiness probe. Returns the configuration status of every
 * external dependency so deployers (and the QLSS admin banner) can surface
 * "not configured" states without hitting Supabase.
 *
 * No auth required — this only reports boolean config flags, never secrets.
 */
export async function GET() {
  const checks = {
    supabase: isSupabaseConfigured(),
    supabase_service_role: isServiceRoleConfigured(),
  };

  const ok = checks.supabase; // Supabase is the hard dependency for core features

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "qlss",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
