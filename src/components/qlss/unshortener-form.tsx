"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ExternalLink,
  ArrowRight,
  Ban,
  Loader2,
  ClipboardPaste,
  Check,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ResolvedUrl {
  resolved_url: string;
  url: string;
  success: boolean;
}

interface HistoryEntry {
  input: string;
  resolved: string;
  timestamp: number;
}

const SHORTENER_DOMAINS = ["bit.ly", "t.co", "goo.gl", "tinyurl", "ow.ly", "is.gd"];
const MAX_HISTORY = 5;
const HISTORY_KEY = "qlss:recent_unshorten";

function isShortenerDomain(url: string): boolean {
  const lower = url.toLowerCase();
  return SHORTENER_DOMAINS.some((d) => lower.includes(d));
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entry: HistoryEntry) {
  try {
    const existing = loadHistory();
    const filtered = existing.filter((e) => e.input !== entry.input);
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function parseMultipleUrls(raw: string): string[] {
  const trimmed = raw.trim();
  // Split by newlines first, then by commas
  if (trimmed.includes("\n")) {
    return trimmed
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [trimmed];
}

function normalizeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export function UnshortenerForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedUrl | null>(null);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [multiResults, setMultiResults] = useState<ResolvedUrl[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Loading skeleton — show for 300ms on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      setHistory(loadHistory());
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [url]);

  // Refresh history when shown
  useEffect(() => {
    if (showHistory) setHistory(loadHistory());
  }, [showHistory, resolved]);

  // URL validation state (for single URL)
  const urlValidation = useMemo(() => {
    const urls = parseMultipleUrls(url);
    if (urls.length > 1) {
      // multi-url mode — just check if all look reasonable
      return "valid";
    }
    if (url.length < 3) return null;
    try {
      const u = new URL(normalizeUrl(urls[0]));
      return u.protocol === "http:" || u.protocol === "https:" ? "valid" : "invalid";
    } catch {
      return "invalid";
    }
  }, [url]);

  const isMultiUrl = parseMultipleUrls(url).length > 1;

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "/" || (e.ctrlKey && e.key === "k")) &&
        !resolved &&
        !multiResults.length &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if (e.key === "Escape" && !resolved && !multiResults.length) {
        setUrl("");
        setError(null);
        textareaRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resolved, multiResults]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        textareaRef.current?.focus();
      }
    } catch {
      toast({
        title: null,
        description: (
          <span className="flex items-center gap-2 text-xs">
            <Ban className="h-3 w-3 shrink-0 text-muted-foreground" />
            could not read clipboard — check permissions
          </span>
        ),
        duration: 2000,
      });
    }
  }, []);

  async function resolveSingleUrl(targetUrl: string): Promise<ResolvedUrl> {
    const normalized = normalizeUrl(targetUrl);
    const res = await fetch("/api/unshorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Could not resolve the URL.");
    return json as ResolvedUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResolved(null);
    setMultiResults([]);
    setBusy(true);
    setShowHistory(false);

    const urls = parseMultipleUrls(url);

    try {
      if (urls.length === 1) {
        const result = await resolveSingleUrl(urls[0]);
        setResolved(result);
        saveHistory({ input: result.url, resolved: result.resolved_url, timestamp: Date.now() });
      } else {
        // Resolve all URLs concurrently
        const results = await Promise.allSettled(
          urls.map(async (u) => {
            try {
              return await resolveSingleUrl(u);
            } catch {
              return { url: u, resolved_url: "", success: false };
            }
          })
        );
        const successful = results
          .filter((r): r is PromiseFulfilledResult<ResolvedUrl> => r.status === "fulfilled")
          .map((r) => r.value);
        setMultiResults(successful);
        // Save each to history
        successful.forEach((r) =>
          saveHistory({ input: r.url, resolved: r.resolved_url, timestamp: Date.now() })
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({
        title: null,
        description: (
          <span className="flex items-center gap-2 text-xs">
            <Check className="h-3 w-3 shrink-0" style={{ color: "#2c6e49" }} />
            copied to clipboard
          </span>
        ),
        duration: 1500,
      });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleReset() {
    setResolved(null);
    setMultiResults([]);
    setError(null);
    setUrl("");
    setCopied(false);
    textareaRef.current?.focus();
  }

  function handleClearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  // ---------------------------------------------------------------------
  // Result card for a single resolved URL
  // ---------------------------------------------------------------------
  function ResultCard({ result, index }: { result: ResolvedUrl; index?: number }) {
    const isChain = result.url !== result.resolved_url;
    const isShortener = isShortenerDomain(result.resolved_url);
    const isSafe = !isShortener;

    return (
      <div
        className={`border border-border bg-card card-hover animate-slide-up ${index !== undefined ? "mt-2" : ""}`}
        style={index !== undefined ? { animationDelay: `${index * 60}ms`, animationFillMode: "backwards" } : undefined}
      >
        {/* Header bar */}
        <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isSafe ? (
              <ShieldCheck className="h-3 w-3" style={{ color: "#2c6e49" }} />
            ) : (
              <ShieldAlert className="h-3 w-3" style={{ color: "#b08a3e" }} />
            )}
            resolved
          </span>
          <div className="flex items-center gap-2">
            {/* Safety badge */}
            {isSafe ? (
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 border" style={{ color: "#2c6e49", borderColor: "#2c6e49" }}>
                <Check className="h-2.5 w-2.5" />
                safe destination
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 border" style={{ color: "#b08a3e", borderColor: "#b08a3e" }}>
                <AlertTriangle className="h-2.5 w-2.5" />
                may redirect further
              </span>
            )}
            {index === undefined && (
              <button
                type="button"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground transition-colors touch-target"
              >
                + new
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          {/* Input */}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">input</p>
            <p className="text-xs text-muted-foreground break-all">{result.url}</p>
          </div>

          {/* Chain detection badge */}
          {isChain && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/50 self-center text-[10px] text-muted-foreground">
              <span className="truncate max-w-[120px]">{result.url}</span>
              <ArrowRight className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate max-w-[180px] text-foreground font-medium">{result.resolved_url}</span>
            </div>
          )}

          {!isChain && (
            <div className="flex items-center justify-center">
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          )}

          {/* Destination */}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">destination</p>
            <div className="flex items-start gap-1.5">
              <a
                href={result.resolved_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline break-all font-medium inline-flex items-center gap-1.5"
              >
                {result.resolved_url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <button
                type="button"
                onClick={() => handleCopy(result.resolved_url)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 touch-target btn-press"
                title="Copy resolved URL"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" style={{ color: "#2c6e49" }} />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------
  if (!mounted) {
    return (
      <div className="w-full space-y-3 animate-fade-in">
        <div className="flex items-stretch border border-border bg-card h-[42px]">
          <div className="pl-4 pr-2 flex items-center">
            <span className="text-muted-foreground text-sm">&gt;</span>
          </div>
          <div className="flex-1 py-3 pr-4">
            <div className="skeleton-shimmer h-3.5 w-3/4 rounded-sm" />
          </div>
          <div className="border-l border-border bg-card px-5 flex items-center">
            <div className="skeleton-shimmer h-3.5 w-14 rounded-sm" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="skeleton-shimmer h-3 w-24 rounded-sm" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Single result state
  // ---------------------------------------------------------------------
  if (resolved) {
    return (
      <div className="w-full space-y-3 animate-fade-in">
        <ResultCard result={resolved} />
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Multi-result state
  // ---------------------------------------------------------------------
  if (multiResults.length > 0) {
    return (
      <div className="w-full space-y-3 animate-fade-in">
        <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="h-3 w-3" style={{ color: "#2c6e49" }} />
            resolved {multiResults.length} url{multiResults.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground transition-colors touch-target"
          >
            + new
          </button>
        </div>
        {multiResults.map((r, i) => (
          <ResultCard key={r.url} result={r} index={i} />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Default state — input form
  // ---------------------------------------------------------------------
  return (
    <div className="w-full space-y-3 animate-fade-in">
      <form onSubmit={handleSubmit} className="w-full space-y-2">
        <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors input-focus-glow">
          <span className="pl-4 pr-2 text-muted-foreground select-none text-sm flex items-start pt-3">
            &gt;
          </span>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="paste a short url to resolve"
              className="w-full bg-transparent border-0 outline-none py-3 text-sm placeholder:text-muted-foreground/60 resize-none overflow-hidden"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              rows={1}
            />
            {/* URL validation indicator */}
            {urlValidation && focused && !isMultiUrl && (
              <span
                className={`absolute right-2 top-3 validation-indicator validation-indicator-enter ${
                  urlValidation === "valid" ? "text-[#2c6e49]" : "text-destructive"
                }`}
              >
                {urlValidation === "valid" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
              </span>
            )}
            {isMultiUrl && focused && (
              <span className="absolute right-2 top-3 text-[9px] text-muted-foreground/60 validation-indicator validation-indicator-enter">
                {parseMultipleUrls(url).length} urls
              </span>
            )}
          </div>
          {!url && !busy && (
            <button
              type="button"
              onClick={handlePaste}
              className="border-l border-border text-muted-foreground hover:text-foreground hover:bg-accent px-3 text-sm transition-colors touch-target btn-press"
              title="Paste from clipboard"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="border-l border-border bg-card text-foreground hover:bg-accent px-5 sm:px-6 text-sm transition-colors disabled:opacity-50 btn-press touch-target"
            disabled={busy || !url}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "resolve"
            )}
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="border border-border px-1 text-[9px]">/</kbd>
              <span className="text-[9px]">or</span>
              <kbd className="border border-border px-1 text-[9px]">Ctrl+K</kbd>
              <span className="text-[9px]">to focus</span>
            </span>
          </span>
          {url.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              <kbd className="border border-border px-1 text-[9px]">Esc</kbd>
              <span className="text-[9px] ml-0.5">to clear</span>
            </span>
          )}
        </div>
      </form>

      {error && (
        <div className="border border-destructive/20 bg-destructive/5 px-4 py-2.5 animate-error-shake">
          <p className="text-xs text-destructive leading-relaxed text-center">
            ! {error}
          </p>
        </div>
      )}

      {/* Recent history */}
      {history.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            <Clock className="h-3 w-3" />
            recent ({history.length})
            <span className="text-[9px]">{showHistory ? "▾" : "▸"}</span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5 animate-slide-up">
              {history.map((entry, i) => (
                <div
                  key={`${entry.input}-${entry.timestamp}`}
                  className="flex items-center gap-2 px-3 py-2 border border-border bg-card/50 text-[10px] list-item-enter"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                >
                  <span className="truncate-ellipsis flex-1 text-muted-foreground min-w-0">
                    {entry.input}
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" />
                  <a
                    href={entry.resolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate-ellipsis flex-1 text-foreground hover:underline min-w-0"
                  >
                    {entry.resolved}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.resolved)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    title="Copy"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex items-center gap-1 text-[9px] text-muted-foreground/40 hover:text-destructive transition-colors px-3 pt-1"
              >
                <X className="h-2.5 w-2.5" />
                clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
