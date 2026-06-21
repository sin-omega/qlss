"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import {
  normalizeUsername,
  isValidUsername,
  isReservedUsername,
} from "@/lib/username";

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced availability check.
  useEffect(() => {
    const candidate = normalizeUsername(username);
    if (!candidate) {
      setAvailable(null);
      return;
    }
    if (!isValidUsername(candidate) || isReservedUsername(candidate)) {
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
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const candidate = normalizeUsername(username);
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
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between text-xs">
        <Link
          href="/"
          className="font-bold tracking-tight hover:opacity-70 transition-opacity"
        >
          QLSS
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3" />
          back
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-lg font-bold tracking-tight mb-2">
            pick a username
          </h1>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            This is what we&apos;ll show in the corner of every page. You can
            change it later.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
              <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">
                @
              </span>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                className="flex-1 bg-transparent border-0 outline-none py-3 text-sm placeholder:text-muted-foreground/60"
                disabled={busy}
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
              />
              {/* Status indicator */}
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

            <button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90 py-3 text-sm transition-colors disabled:opacity-50"
              disabled={busy || available !== true}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "save & continue"
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
