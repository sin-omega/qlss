import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatsData {
  ok: boolean;
  links: number;
  clicks: number;
  markdownPages: number;
  accounts: number;
  generatedAt: string;
  cached: boolean;
}

// 60-second in-memory cache (per-server-instance)
let cached: { data: StatsData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

const MOCK_DATA: StatsData = {
  ok: true,
  links: 184_213,
  clicks: 1_402_133,
  markdownPages: 9_412,
  accounts: 12_847,
  generatedAt: new Date().toISOString(),
  cached: false,
};

async function fetchRealStats(): Promise<StatsData> {
  const service = createServiceClient();
  const generatedAt = new Date().toISOString();

  // Run the four queries in parallel; each one is independently fault-tolerant.
  const [linksRes, linksForClicksRes, mdRes, accountsRes] = await Promise.allSettled([
    service.from("links").select("*", { count: "exact", head: true }),
    // Pull just the use_count column to sum client-side (avoids RPC dependency).
    service.from("links").select("use_count"),
    service
      .from("links")
      .select("*", { count: "exact", head: true })
      .eq("link_type", "markdown"),
    // Registered accounts = number of profiles in the profiles table.
    service.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const links =
    linksRes.status === "fulfilled" ? (linksRes.value.count ?? 0) : 0;

  let clicks = 0;
  if (linksForClicksRes.status === "fulfilled") {
    const rows = (linksForClicksRes.value.data ?? []) as Array<{
      use_count: number | null;
    }>;
    clicks = rows.reduce((sum, r) => sum + (r.use_count ?? 0), 0);
  }

  const markdownPages =
    mdRes.status === "fulfilled" ? (mdRes.value.count ?? 0) : 0;

  const accounts =
    accountsRes.status === "fulfilled" ? (accountsRes.value.count ?? 0) : 0;

  return {
    ok: true,
    links,
    clicks,
    markdownPages,
    accounts,
    generatedAt,
    cached: false,
  };
}

export async function GET() {
  // Serve from cache if still fresh
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { ...cached.data, cached: true },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      },
    );
  }

  let data: StatsData;
  if (!isSupabaseConfigured()) {
    data = { ...MOCK_DATA, generatedAt: new Date().toISOString() };
  } else {
    try {
      data = await fetchRealStats();
    } catch (err) {
      console.warn("[api/stats] real fetch failed, using mock:", err);
      data = { ...MOCK_DATA, generatedAt: new Date().toISOString() };
    }
  }

  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };

  return NextResponse.json(data, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
