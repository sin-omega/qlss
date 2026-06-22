"use client";

import { useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useSignedIn } from "@/hooks/use-signed-in";

interface CreatedLink {
  slug: string;
  short_url: string;
  destination_url: string;
  owner: boolean;
}

/**
 * Shortener form. Anonymous: paste URL, get link. Signed-in: also
 * gets custom alias, title, and description fields.
 */
export function ShortenerForm() {
  const signedIn = useSignedIn();

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
          title: title || undefined,
          description: description || undefined,
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
      setTitle("");
      setDescription("");
      setShowDetails(false);

      if (!(json as CreatedLink).owner && (json as CreatedLink).slug) {
        try {
          const key = "qlss:anonymous_slugs";
          const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
          if (!existing.includes((json as CreatedLink).slug)) {
            existing.push((json as CreatedLink).slug);
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {
          // ignore
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
  // Result state
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
                <><Check className="h-3 w-3" /> copied</>
              ) : (
                <><Copy className="h-3 w-3" /> copy</>
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
  // Input form
  // ---------------------------------------------------------------------
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full space-y-2">
        {/* URL input */}
        <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
          <span className="pl-4 pr-2 text-muted-foreground select-none text-sm flex items-center">
            &gt;
          </span>
          <input
            type="text"
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

        {/* Expandable details — signed-in users only */}
        {signedIn && (
          <div className="border border-border bg-card">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="w-full px-4 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between hover:text-foreground transition-colors"
            >
              <span>details</span>
              {showDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showDetails && (
              <div className="px-4 pb-3 space-y-2 border-t border-border">
                {/* Custom alias */}
                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-1.5 text-muted-foreground select-none text-[11px] flex items-center">
                    /
                  </span>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.toLowerCase())}
                    placeholder="custom alias (optional)"
                    className="flex-1 bg-transparent border-0 outline-none py-2 text-xs placeholder:text-muted-foreground/60"
                    disabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                  />
                  {alias && (
                    <button
                      type="button"
                      onClick={() => setAlias("")}
                      className="px-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      clear
                    </button>
                  )}
                </div>

                {/* Title */}
                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="title (optional)"
                    className="flex-1 bg-transparent border-0 outline-none py-2 text-xs placeholder:text-muted-foreground/60 px-2"
                    disabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={140}
                  />
                </div>

                {/* Description — single-line, smaller */}
                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="description (optional)"
                    className="flex-1 bg-transparent border-0 outline-none py-2 text-[11px] placeholder:text-muted-foreground/60 px-2"
                    disabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={500}
                  />
                </div>
              </div>
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
