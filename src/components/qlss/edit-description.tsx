"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

/**
 * Inline form to edit the user's profile description (bio). Shows the
 * current description (or "no description" placeholder), a button to
 * edit, and an inline textarea + save/cancel when editing.
 */
export function EditDescriptionForm({
  currentDescription,
}: {
  currentDescription: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(currentDescription);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Keep local state in sync if the prop changes (e.g. after router.refresh()).
  useEffect(() => {
    setDescription(currentDescription);
  }, [currentDescription]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not save description.");
        return;
      }
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border bg-card">
      <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
        description
      </div>
      <div className="p-4">
        {!editing ? (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-foreground/90 flex-1 min-w-0">
              {currentDescription || (
                <span className="text-muted-foreground italic">
                  no description
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-foreground border border-border bg-background hover:bg-accent px-3 py-1.5 transition-colors shrink-0"
            >
              {currentDescription ? "edit" : "add"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="a short bio shown on your public profile"
              className="w-full bg-transparent border border-border px-2 py-1.5 text-sm outline-none focus:border-foreground resize-y min-h-20"
              maxLength={500}
              rows={3}
              disabled={busy}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {description.length}/500 · shown on your profile page
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDescription(currentDescription);
                    setError(null);
                  }}
                  disabled={busy}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="text-xs bg-foreground text-background hover:bg-foreground/90 px-3 py-1 inline-flex items-center gap-1"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  save
                </button>
              </div>
            </div>
          </form>
        )}

        {error && (
          <p className="mt-2 text-xs text-destructive">! {error}</p>
        )}
        {saved && !editing && (
          <p className="mt-2 text-xs text-foreground/80">Saved.</p>
        )}
      </div>
    </div>
  );
}
