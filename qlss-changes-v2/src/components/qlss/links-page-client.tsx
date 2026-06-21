"use client";

import { useEffect, useState } from "react";
import { LinkList } from "@/components/qlss/link-list";
import {
  FolderManager,
  type Folder,
} from "@/components/qlss/folder-manager";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  folder_id: string | null;
  title: string | null;
  description: string | null;
}

interface LinksPageClientProps {
  links: LinkRow[];
  counts: Record<string, number>;
  folders: Folder[];
  activeFolderId: string;
  origin: string;
}

/**
 * Client wrapper for the links page. Holds the active folder filter in
 * state so switching is instant, and lets the FolderManager update it.
 *
 * The visible links list is re-filtered client-side when the user
 * clicks a different folder chip. The ?folder= URL param is also
 * synced via replaceState so a refresh keeps the same view.
 */
export function LinksPageClient({
  links,
  counts,
  folders: initialFolders,
  activeFolderId: initialActive,
  origin,
}: LinksPageClientProps) {
  const [activeFolderId, setActiveFolderId] = useState(initialActive);
  const [folders, setFolders] = useState(initialFolders);

  // Keep folders in sync if the server passes a new list (e.g. after
  // creating/deleting a folder triggers a router.refresh()). Using
  // useEffect avoids the "setState during render" anti-pattern.
  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  // Re-filter the links when the active folder changes.
  let visibleLinks = links;
  if (activeFolderId === "unsorted") {
    visibleLinks = links.filter((l) => !l.folder_id);
  } else if (activeFolderId !== "all") {
    visibleLinks = links.filter((l) => l.folder_id === activeFolderId);
  }

  function handleActiveChange(id: string) {
    setActiveFolderId(id);
    // Update the URL so refresh keeps the same view. Use replaceState
    // so we don't spam the back button history.
    const url = new URL(window.location.href);
    if (id === "all") {
      url.searchParams.delete("folder");
    } else {
      url.searchParams.set("folder", id);
    }
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <section className="px-6 py-10 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Your links</h1>
          </div>
          {links.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {visibleLinks.length} of {links.length}
            </span>
          )}
        </div>

        {links.length === 0 ? (
          <div className="border border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">No links yet.</p>
            <a
              href="/dashboard/shortener"
              className="text-xs text-foreground underline hover:opacity-70 mt-2 inline-block"
            >
              create your first one
            </a>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <FolderManager
                folders={folders}
                activeFolderId={activeFolderId}
                onActiveChange={handleActiveChange}
              />
            </div>

            {visibleLinks.length === 0 ? (
              <div className="border border-border bg-card py-10 text-center">
                <p className="text-xs text-muted-foreground">
                  No links in this view.
                </p>
              </div>
            ) : (
              <LinkList
                links={visibleLinks}
                counts={counts}
                origin={origin}
                folders={folders}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
