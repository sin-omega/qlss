"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function Banner({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !text.trim()) return null;

  return (
    <div className="border-b border-border bg-card/80 px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground flex-1 min-w-0">
        {text}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 touch-target"
        aria-label="Dismiss banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}