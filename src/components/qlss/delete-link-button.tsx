"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

/**
 * Small delete button shown on the stats page header. Two-step:
 * click once to reveal a confirm prompt, click again to actually
 * delete. After deletion, bounces back to the dashboard.
 */
export function DeleteLinkButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/links/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        console.warn("delete failed:", json?.error);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5"
        disabled={busy}
      >
        <Trash2 className="h-3 w-3" />
        delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">delete this link?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="text-destructive hover:underline disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="text-muted-foreground hover:text-foreground"
      >
        cancel
      </button>
    </div>
  );
}
