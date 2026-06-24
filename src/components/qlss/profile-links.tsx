"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Copy, Check, Pencil, ExternalLink } from "lucide-react";

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

  const redirectLinks = links.filter((l) => l.link_type !== "markdown");
  const markdownLinks = links.filter((l) => l.link_type === "markdown");

  return (
    <div className="space-y-8">
      {redirectLinks.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">redirects</p>
          <div className="border-t border-border">
            {redirectLinks.map((link, i) => (
              <LinkRow
                key={link.id}
                link={link}
                clickCount={counts[link.id] ?? 0}
                origin={origin}
                copiedSlug={copiedSlug}
                confirmSlug={confirmSlug}
                deletingSlug={deletingSlug}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onConfirm={setConfirmSlug}
                i={i}
                total={redirectLinks.length}
              />
            ))}
          </div>
        </div>
      )}

      {markdownLinks.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">markdown pages</p>
          <div className="border-t border-border">
            {markdownLinks.map((link, i) => (
              <LinkRow
                key={link.id}
                link={link}
                clickCount={counts[link.id] ?? 0}
                origin={origin}
                copiedSlug={copiedSlug}
                confirmSlug={confirmSlug}
                deletingSlug={deletingSlug}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onConfirm={setConfirmSlug}
                i={i}
                total={markdownLinks.length}
                isMarkdown
              />
            ))}
          </div>
        </div>
      )}

      {links.length === 0 && (
        <div className="border border-border bg-card py-12 px-6 text-center">
          <p className="text-xs text-muted-foreground mb-4">no links yet</p>
          <a href="/" className="text-xs text-foreground border border-border hover:bg-accent px-4 py-2 inline-flex items-center gap-1.5 transition-colors">
            create your first link
          </a>
        </div>
      )}
    </div>
  );
}

function LinkRow({
  link,
  clickCount,
  origin,
  copiedSlug,
  confirmSlug,
  deletingSlug,
  onCopy,
  onDelete,
  onConfirm,
  i,
  total,
  isMarkdown,
}: {
  link: LinkRow;
  clickCount: number;
  origin: string;
  copiedSlug: string | null;
  confirmSlug: string | null;
  deletingSlug: string | null;
  onCopy: (slug: string) => void;
  onDelete: (slug: string) => void;
  onConfirm: (slug: string | null) => void;
  i: number;
  total: number;
  isMarkdown?: boolean;
}) {
  const shortUrl = `${origin}/${link.slug}`;
  const isConfirming = confirmSlug === link.slug;
  const isDeleting = deletingSlug === link.slug;

  return (
    <div className="py-2.5 group hover:bg-accent/40 -mx-2 px-2 transition-colors">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={isMarkdown ? `/${link.slug}` : `/stats/${link.slug}`}
            className="text-xs font-medium truncate block group-hover:underline"
          >
            /{link.slug}
          </a>
          {isMarkdown && (
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
              markdown page
            </p>
          )}
          {!isMarkdown && (
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
              -&gt; {link.destination_url}
            </p>
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
            onClick={() => onCopy(link.slug)}
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
                onClick={() => onDelete(link.slug)}
                disabled={isDeleting}
                className="text-destructive hover:underline disabled:opacity-50"
              >
                {isDeleting ? "..." : "confirm"}
              </button>
              <button
                type="button"
                onClick={() => onConfirm(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onConfirm(link.slug)}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              aria-label={`Delete ${link.slug}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {i < total - 1 && <hr className="mt-2.5 border-t border-border opacity-50" />}
    </div>
  );
}
