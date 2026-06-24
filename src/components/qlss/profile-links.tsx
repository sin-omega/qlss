"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Copy, Check, ExternalLink, Link } from "lucide-react";

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

  const activeLinks = links;

  return (
    <div className="space-y-4">
      {activeLinks.length === 0 ? (
        <div className="border border-border bg-card py-12 px-6 text-center">
          <p className="text-xs text-muted-foreground mb-4">no links yet</p>
          <a href="/" className="text-xs text-foreground border border-border hover:bg-accent px-4 py-2 inline-flex items-center gap-1.5 transition-colors">
            create your first link
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
  const [copied, setCopied] = useState<string | null>(null);

  function copySlug(slug: string) {
    const url = origin + "/" + slug;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="divide-y divide-border">
      {links.map((link) => {
        const url = origin + "/" + link.slug;
        const clickCount = counts[link.id] ?? 0;

        return (
          <div key={link.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 text-xs hover:bg-accent/20 transition-colors group">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {link.title || link.destination_url || link.slug}
                </span>
                {link.destination_url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <a href={url} className="hover:underline truncate">{url}</a>
                <span>·</span>
                <span>{clickCount} click{clickCount !== 1 ? "s" : ""}</span>
                {link.created_at && (
                  <>
                    <span>·</span>
                    <span>{new Date(link.created_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => copySlug(link.slug)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="copy url"
              >
                {copied === link.slug ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
