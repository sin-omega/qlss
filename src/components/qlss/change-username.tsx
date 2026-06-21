"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import {
  normalizeUsername,
  isValidUsername,
  isReservedUsername,
} from "@/lib/username";

/**
 * Inline form to change the current username. Same validation +
 * availability check as the setup page, but pre-fills with the
 * current username and shows a "saved!" confirmation on success.
 */
export function ChangeUsernameForm({
  currentUsername,
}: {
  currentUsername: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Reset state when the prop changes (e.g. after router.refresh()).
  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  // Debounced availability check — but only if the username is different
  // from the current one.
  useEffect(() => {
    const candidate = normalizeUsername(username);
    if (candidate === currentUsername) {
      setAvailable(null);
      return;
    }
    if (!candidate || !isValidUsername(candidate) || isReservedUsername(candidate)) {
      setAvailable(false);
      return;
    }

    setChecking(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/profile/check?username=${encodeURIComponent(candidate)}`,
        );
        if (!res.ok) {
          setAvailable(null);
          return;
        }
        const json = await res.json();
        setAvailable(Boolean(json.available));
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [username, currentUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const candidate = normalizeUsername(username);
    if (candidate === currentUsername) return;
    if (!isValidUsername(candidate)) {
      setError("Username must be 3–20 chars, start with a letter, and only contain lowercase letters, numbers, underscores, or hyphens.");
      return;
    }
    if (isReservedUsername(candidate)) {
      setError("That username is reserved. Try another.");
      return;
    }
    if (available === false) {
      setError("That username is taken. Try another.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: candidate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not save username.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const isUnchanged = normalizeUsername(username) === currentUsername;

  return (
    <div className="border border-border bg-card">
      <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
        username
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
            <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
            />
            <div className="px-3 flex items-center">
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : available === true ? (
                <Check className="h-3.5 w-3.5 text-foreground" />
              ) : available === false ? (
                <X className="h-3.5 w-3.5 text-destructive" />
              ) : null}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            3–20 chars, starts with a letter. Letters, numbers, underscores,
            hyphens only.
          </p>

          {error && (
            <p className="text-xs text-destructive leading-relaxed">
              ! {error}
            </p>
          )}
          {saved && (
            <p className="text-xs text-foreground/80 leading-relaxed">
              Saved. Your username is now @{normalizeUsername(username)}.
            </p>
          )}

          <button
            type="submit"
            className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2 text-xs transition-colors disabled:opacity-50"
            disabled={busy || isUnchanged || available === false}
          >
            {busy ? "..." : "save"}
          </button>
        </form>
      </div>
    </div>
  );
}
