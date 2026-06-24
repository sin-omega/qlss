"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Copy, Check, Pencil, ExternalLink, Link, FileText } from "lucide-react";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  link_type: string;
  title: string | null;
  description: string | null;
}

export function ProfileLinks({
  links,
  counts,
  origin,
}: {
  links: LinkRow[];
  counts: Record<string, number>;
  origin: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"redirects" | "markdown">("redirects");

  const redirectLinks = links.filter((l) => l.link_type !== "markdown");
  const markdownLinks = links.filter((l) => l.link_type === "markdown");
  const activeLinks = tab === "redirects" ? redirectLinks : markdownLinks;
  const empty = tab === "redirects" ? redirectLinks.length === 0 : markdownLinks.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex border border-border bg-card">
        <button
          type="button"
          onClick={() => setTab("redirects")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs transition-colors ${
            tab === "redirects"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          } ${tab === "markdown" ? "border-l border-border" : ""}`}
        >
          <Link className="h-3.5 w-3.5" />
          redirects ({redirectLinks.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("markdown")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs border-l border-border transition-colors ${
            tab === "markdown"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          pages ({markdownLinks.length})
        </button>
      </div>

      {empty ? (
        <div className="border border-border bg-card py-12 px-6 text-center">
          <p className="text-xs text-muted-foreground mb-4">
            {tab === "redirects" ? "no redirects yet" : "no markdown pages yet"}
          </p>
          <a href="/" className="text-xs text-foreground border border-border hover:bg-accent px-4 py-2 inline-flex items-center gap-1.5 transition-colors">
            create your first {tab === "redirects" ? "link" : "page"}
          </a>
        </div>
      ) : (
        <div className="border-t border-border">
          <LinkList links={activeLinks} counts={counts} origin={origin} />
        </div>
      )}
    </div>
  );
}

function LinkList({
  links,
  counts,
  origin,
}: {
  links: LinkRow[];
  counts: Record<string, number>;
  origin: string;
}) {
  const router = useRouter();
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function handleDelete(slug: string) {
    setDeletingSlug(slug);
    try {
      await fetch(`/api/links/${slug}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingSlug(null);
      setConfirmSlug(null);
    }
  }

  async function handleCopy(slug: string) {
    const url = `${origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <>
      {links.map((link, i) => {
        const isMarkdown = link.link_type === "markdown";
        const shortUrl = `${origin}/${link.slug}`;
        const isConfirming = confirmSlug === link.slug;
        const isDeleting = deletingSlug === link.slug;
        const clickCount = counts[link.id] ?? 0;

        return (
          <div key={link.id} className="py-2.5 group hover:bg-accent/40 -mx-2 px-2 transition-colors">
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a
                  href={isMarkdown ? `/${link.slug}` : `/stats/${link.slug}`}
                  className="text-xs font-medium truncate block group-hover:underline"
                >
                  /{link.slug}
                </a>
                {isMarkdown ? (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">markdown page</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">-&gt; {link.destination_url}</p>
                )}
              </div>
              <div className="text-right shrink-0 text-[11px] text-muted-foreground tabular-nums flex items-baseline gap-2">
                <a href={`/stats/${link.slug}`} className="hover:underline">
                  <span className="text-foreground font-medium">{clickCount}</span>{" "}
                  {clickCount === 1 ? "click" : "clicks"}
                </a>

                {isMarkdown && (
                  <a
                    href={`/${link.slug}/edit`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit markdown"
                  >
                    <Pencil className="h-3 w-3" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleCopy(link.slug)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy short URL"
                >
                  {copiedSlug === link.slug ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>

                {isConfirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDelete(link.slug)}
                      disabled={isDeleting}
                      className="text-destructive hover:underline disabled:opacity-50"
                    >
                      {isDeleting ? "..." : "confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSlug(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSlug(link.slug)}
                    disabled={isDeleting}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    aria-label={`Delete ${link.slug}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            {i < links.length - 1 && <hr className="mt-2.5 border-t border-border opacity-50" />}
          </div>
        );
      })}
    </>
  );
}
