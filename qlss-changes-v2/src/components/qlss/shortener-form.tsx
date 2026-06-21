"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
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
 * custom-alias field. After shortening, title & description fields
 * appear automatically so the user can fill them in without clicking
 * a collapsible.
 */
export function ShortenerForm() {
  const signedIn = useSignedIn();

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  // Post-shorten title & description fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input after shortening
  useEffect(() => {
    if (created && signedIn) {
      titleRef.current?.focus();
    }
  }, [created, signedIn]);

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
      setMetaSaved(false);

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

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!created) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/links/${created.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Could not save title/description.");
        return;
      }
      setMetaSaved(true);
    } catch {
      setError("Network error.");
    } finally {
      setSavingMeta(false);
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
    setTitle("");
    setDescription("");
    setMetaSaved(false);
  }

  // ---------------------------------------------------------------------
  // Result state — replaces the input so the page stays at one height
  // ---------------------------------------------------------------------
  if (created) {
    return (
      <div className="w-full space-y-3">
        {/* Result card */}
        <div className="border border-border bg-card">
          <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>result</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              + new
            </button>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <a
                href={created.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline break-all"
              >
                {created.short_url}
              </a>
              <p className="mt-0.5 text-[11px] text-muted-foreground break-all">
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

        {/* Title & description — auto-shown for signed-in users */}
        {signedIn && (
          <div className="border border-border bg-card">
            <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
              {metaSaved ? "saved" : "details"}
            </div>
            <form onSubmit={handleSaveMeta} className="px-4 py-3 space-y-2">
              <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-[11px] flex items-center">
                  title
                </span>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="link title (optional)"
                  className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60"
                  maxLength={140}
                  disabled={savingMeta || metaSaved}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-[11px] flex items-start pt-1.5">
                  desc
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="short description (optional)"
                  className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60"
                  maxLength={500}
                  disabled={savingMeta || metaSaved}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {(title || description) && (
                  <button
                    type="submit"
                    disabled={savingMeta || metaSaved || (!title.trim() && !description.trim())}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 border border-border bg-background hover:bg-accent disabled:opacity-50"
                  >
                    {savingMeta ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : metaSaved ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                    {metaSaved ? "saved" : "save"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {!created.owner && (
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
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
