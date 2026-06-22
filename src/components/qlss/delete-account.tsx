"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Danger zone: permanently deletes the user's account, all their links,
 * and all analytics for those links. Two-step confirm — user must type
 * their username to enable the delete button.
 */
export function DeleteAccountSection({ username }: { username: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toLowerCase() === username.toLowerCase();

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Could not delete account.");
        return;
      }
      // Sign out locally (the auth user is already gone server-side).
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-destructive/40 bg-card">
      <div className="px-4 py-1.5 border-b border-destructive/40 text-[10px] uppercase tracking-widest text-destructive">
        danger zone
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Delete your account</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            This permanently deletes your account, all your short links, and
            all click analytics for those links. This cannot be undone.
          </p>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground block mb-1.5">
            type{" "}
            <span className="text-foreground font-medium">@{username}</span>{" "}
            to confirm
          </label>
          <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
            <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">
              @
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toLowerCase())}
              placeholder={username}
              className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive leading-relaxed">
            ! {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={busy || !canDelete}
          className="bg-destructive text-white hover:bg-destructive/90 px-4 py-2 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "delete my account"
          )}
        </button>
      </div>
    </div>
  );
}
