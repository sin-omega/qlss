import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrendingLink {
  slug: string;
  clicks: number;
  linkType: "redirect" | "markdown";
  createdAt: string;
}

interface TrendingData {
  ok: boolean;
  links: TrendingLink[];
  cached: boolean;
}

let cached: { data: TrendingData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

const MOCK_LINKS: TrendingLink[] = [
  { slug: "gh-demo", clicks: 1247, linkType: "redirect", createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { slug: "rfc-3596", clicks: 982, linkType: "markdown", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { slug: "setup-guide", clicks: 731, linkType: "markdown", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString() },
  { slug: "launch-blog", clicks: 612, linkType: "redirect", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  { slug: "api-docs", clicks: 489, linkType: "markdown", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
];

const MOCK_DATA: TrendingData = {
  ok: true,
  links: MOCK_LINKS,
  cached: false,
};

async function fetchRealTrending(): Promise<TrendingData> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("links")
    .select("slug, use_count, link_type, created_at")
    .gt("use_count", 0)
    .order("use_count", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const links: TrendingLink[] = (data ?? []).map((row: Record<string, unknown>) => ({
    slug: String(row.slug ?? ""),
    clicks: Number(row.use_count ?? 0),
    linkType: row.link_type === "markdown" ? "markdown" : "redirect",
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }));

  return { ok: true, links, cached: false };
}

export async function GET() {
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

  let data: TrendingData;
  if (!isSupabaseConfigured()) {
    data = { ...MOCK_DATA };
  } else {
    try {
      data = await fetchRealTrending();
    } catch (err) {
      console.warn("[api/trending] real fetch failed, using mock:", err);
      data = { ...MOCK_DATA };
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
