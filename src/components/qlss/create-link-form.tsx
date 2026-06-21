"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Copy, Loader2 } from "lucide-react";

interface CreatedLink {
  slug: string;
  short_url: string;
  destination_url: string;
  owner: boolean;
}

/**
 * Create-link form for the dashboard. After shortening, automatically
 * shows title + description fields so the user can organise immediately.
 */
export function CreateLinkForm() {
  const router = useRouter();
  const supabase = createClient();

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  // Title + description — auto-shown after shortening
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleSaved, setTitleSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setBusy(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setError("Your session expired. Refresh and sign in again.");
        return;
      }

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
      setTitle("");
      setDescription("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTitleDescription(e: React.FormEvent) {
    e.preventDefault();
    if (!created) return;
    setTitleBusy(true);
    setError(null);

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
        setError(json?.error ?? "Could not save.");
        return;
      }
      setTitleSaved(true);
      setTimeout(() => setTitleSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setTitleBusy(false);
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
    setTitleSaved(false);
  }

  if (created) {
    return (
      <div className="w-full space-y-2">
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

        {/* Auto title + description editor */}
        <div className="border border-border bg-card">
          <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
            organise this link
          </div>
          <form
            onSubmit={handleSaveTitleDescription}
            className="p-4 space-y-2"
          >
            <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
              <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                T
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="title (optional)"
                className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60"
                maxLength={140}
                disabled={titleBusy}
              />
            </div>

            <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
              <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-start pt-1.5">
                D
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="short description (optional)"
                className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60 resize-none"
                maxLength={500}
                rows={1}
                disabled={titleBusy}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={titleBusy}
                className="text-xs bg-foreground text-background hover:bg-foreground/90 px-3 py-1 inline-flex items-center gap-1 disabled:opacity-50"
              >
                {titleBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : titleSaved ? (
                  <>
                    <Check className="h-3 w-3" /> saved
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" /> save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <p className="text-xs text-destructive leading-relaxed">! {error}</p>
        )}
      </div>
    );
  }

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
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="paste a long url"
            className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
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

        <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
          <span className="pl-4 pr-2 text-muted-foreground select-none text-xs flex items-center">
            /
          </span>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value.toLowerCase())}
            placeholder="custom alias (optional)"
            className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
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
      </form>

      {error && (
        <p className="mt-2 text-xs text-destructive leading-relaxed">! {error}</p>
      )}
    </div>
  );
}
