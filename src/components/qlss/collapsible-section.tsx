"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Reusable collapsible section with a colored left accent.
 *
 * Used on the stats pages to declutter the page — visitors can collapse
 * sections they don't care about right now.
 *
 * Props:
 *   - title: section heading
 *   - accent: tailwind color class for the left border (e.g. "border-l-2 border-l-foreground",
 *       or use the `accentColor` prop for a specific hex color)
 *   - accentColor: hex color for the left accent bar (e.g. "#0c0c0a")
 *   - defaultOpen: whether the section starts expanded (default true)
 *   - children: the section content
 *   - summary: optional small text shown on the right of the header (e.g. "5 visitors")
 */
export function CollapsibleSection({
  title,
  accentColor = "#0c0c0a",
  defaultOpen = true,
  summary,
  children,
}: {
  title: string;
  accentColor?: string;
  defaultOpen?: boolean;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="border border-border bg-card"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-medium uppercase tracking-widest truncate">
            {title}
          </span>
        </div>
        {summary && (
          <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
            {summary}
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>
      )}
    </div>
  );
}
