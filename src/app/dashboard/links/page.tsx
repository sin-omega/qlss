import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/env";
import { LinkList } from "@/components/qlss/link-list";
import { LinksPageClient } from "@/components/qlss/links-page-client";

export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  folder_id: string | null;
  title: string | null;
  description: string | null;
}

interface FolderRow {
  id: string;
  name: string;
  created_at: string;
  profile_page?: boolean;
}

export default async function DashboardLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { folder: activeFolderId } = await searchParams;

  // Fetch the user's links (RLS-scoped). Include folder_id — if the
  // schema-update-folders migration hasn't been run yet, this query
  // will return an error and we'll show a clear message instead of an
  // empty list.
  const { data: links, error: linksError } = await supabase
    .from("links")
    .select("id, slug, destination_url, created_at, folder_id, title, description")
    .order("created_at", { ascending: false });

  // Fetch the user's folders. Same migration dependency.
  const { data: folders, error: foldersError } = await supabase
    .from("folders")
    .select("id, name, created_at, profile_page")
    .order("created_at", { ascending: true });

  // If either query failed because the schema migration wasn't run,
  // show a clear error instead of silently rendering "no links".
  if (linksError || foldersError) {
    const msg = linksError?.message || foldersError?.message || "";
    const needsMigration =
      msg.includes("folder_id") ||
      msg.includes("title") ||
      msg.includes("description") ||
      msg.includes("folders") ||
      msg.includes("does not exist") ||
      msg.includes("Could not find") ||
      msg.includes('relation "public.folders"');

    return (
      <section className="px-6 py-10 md:py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-bold tracking-tight">Your links</h1>

          <div className="mt-6 border border-destructive/40 bg-card p-4">
            <p className="text-sm font-medium text-destructive">
              Couldn&apos;t load links.
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {needsMigration
                ? "You need to run the schema migrations. Open Supabase SQL Editor and run both download/schema-update-folders.sql and download/schema-update-titles-bios.sql. The first adds the folders table + folder_id column; the second adds the title + description columns on links and the description column on profiles."
                : `Database error: ${msg}`}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Fetch click counts per link in a single query.
  const linkIds = (links ?? []).map((l) => l.id);
  let countsByLink: Record<string, number> = {};
  if (linkIds.length > 0) {
    const { data: counts } = await supabase
      .from("analytics")
      .select("link_id")
      .in("link_id", linkIds);

    countsByLink = (counts ?? []).reduce<Record<string, number>>((acc, row) => {
      const r = row as { link_id: string };
      acc[r.link_id] = (acc[r.link_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const allLinks = (links ?? []) as unknown as LinkRow[];
  const allFolders = (folders ?? []) as unknown as FolderRow[];

  return (
    <LinksPageClient
      links={allLinks}
      counts={countsByLink}
      folders={allFolders}
      activeFolderId={activeFolderId ?? "all"}
      origin={siteOrigin()}
    />
  );
}
