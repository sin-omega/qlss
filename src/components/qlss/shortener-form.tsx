"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useSignedIn } from "@/hooks/use-signed-in";

interface CreatedLink {
  slug: string;
  short_url: string;
  destination_url: string;
  owner: boolean;
}

/**
 * The shortener form. Anonymous use is allowed — paste a URL, get a
 * short link back. Signed-in users additionally get an optional
 * custom-alias field. The result replaces the input area so the page
 * stays scrollless.
 */
export function ShortenerForm() {
  const signedIn = useSignedIn();

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setBusy(true);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_url: url,
          custom_slug: alias || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not create the link.");
        return;
      }

      setCreated(json as CreatedLink);
      setUrl("");
      setAlias("");

      // If the link was created anonymously, store its slug in localStorage
      // so the dashboard can auto-claim it after the user signs in.
      if (!(json as CreatedLink).owner && (json as CreatedLink).slug) {
        try {
          const key = "qlss:anonymous_slugs";
          const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
          if (!existing.includes((json as CreatedLink).slug)) {
            existing.push((json as CreatedLink).slug);
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {
          // localStorage might be unavailable (private mode, etc.) — fine.
        }
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function handleReset() {
    setCreated(null);
    setError(null);
    setCopied(false);
  }

  // ---------------------------------------------------------------------
  // Result state — replaces the input so the page stays at one height
  // ---------------------------------------------------------------------
  if (created) {
    return (
      <div className="w-full">
        <div className="border border-border bg-card">
          <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>result</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              + new
            </button>
          </div>
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <a
                href={created.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline break-all"
              >
                {created.short_url}
              </a>
              <p className="mt-1 text-xs text-muted-foreground break-all">
                -&gt; {created.destination_url}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border bg-background hover:bg-accent"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> copy
                </>
              )}
            </button>
          </div>
        </div>
        {!created.owner && (
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed text-center">
            unclaimed —{" "}
            <a href="/auth" className="underline hover:text-foreground">
              sign in
            </a>{" "}
            to save &amp; track
          </p>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Default state — input form
  // ---------------------------------------------------------------------
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full space-y-2">
        <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
          <span className="pl-4 pr-2 text-muted-foreground select-none text-sm flex items-center">
            &gt;
          </span>
          <input
            type="url"
            required
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="paste a long url"
            className="flex-1 bg-transparent border-0 outline-none py-3 text-sm placeholder:text-muted-foreground/60"
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="border-l border-border bg-card text-foreground hover:bg-accent px-5 text-sm transition-colors disabled:opacity-50"
            disabled={busy || !url}
          >
            {busy ? "..." : "shorten"}
          </button>
        </div>

        {signedIn && (
          <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
            <span className="pl-4 pr-2 text-muted-foreground select-none text-xs flex items-center">
              /
            </span>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value.toLowerCase())}
              placeholder="custom alias (optional)"
              className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
            />
            {alias && (
              <button
                type="button"
                onClick={() => setAlias("")}
                className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                clear
              </button>
            )}
          </div>
        )}
      </form>

      {error && (
        <p className="mt-3 text-xs text-destructive leading-relaxed text-center">
          ! {error}
        </p>
      )}
    </div>
  );
}
