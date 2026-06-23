import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecentLink {
  slug: string;
  created_at: string;
  ago: string;
}

interface RecentData {
  ok: boolean;
  links: RecentLink[];
  cached: boolean;
}

let cached: { data: RecentData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const MOCK_LINKS: RecentLink[] = [
  { slug: "cli-tool", created_at: new Date(Date.now() - 1000 * 12).toISOString(), ago: "" },
  { slug: "dev-blog", created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), ago: "" },
  { slug: "changelog-v2", created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), ago: "" },
  { slug: "share-photos", created_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(), ago: "" },
  { slug: "meetup-2025", created_at: new Date(Date.now() - 1000 * 60 * 23).toISOString(), ago: "" },
  { slug: "rust-wasm", created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(), ago: "" },
  { slug: "dark-theme", created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), ago: "" },
  { slug: "perf-tips", created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), ago: "" },
].map((l) => ({ ...l, ago: relativeTime(l.created_at) }));

const MOCK_DATA: RecentData = {
  ok: true,
  links: MOCK_LINKS,
  cached: false,
};

async function fetchRecentLinks(): Promise<RecentData> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("links")
    .select("slug, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  const links: RecentLink[] = (data ?? []).map((row: Record<string, unknown>) => {
    const created_at = String(row.created_at ?? new Date().toISOString());
    return {
      slug: String(row.slug ?? ""),
      created_at,
      ago: relativeTime(created_at),
    };
  });

  return { ok: true, links, cached: false };
}

export async function GET() {
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { ...cached.data, cached: true },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=10, s-maxage=10",
        },
      },
    );
  }

  let data: RecentData;
  if (!isSupabaseConfigured()) {
    data = { ...MOCK_DATA, links: MOCK_DATA.links.map((l) => ({ ...l, ago: relativeTime(l.created_at) })) };
  } else {
    try {
      data = await fetchRecentLinks();
    } catch (err) {
      console.warn("[api/recent] real fetch failed, using mock:", err);
      data = { ...MOCK_DATA, links: MOCK_DATA.links.map((l) => ({ ...l, ago: relativeTime(l.created_at) })) };
    }
  }

  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };

  return NextResponse.json(data, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=10, s-maxage=10",
    },
  });
}
