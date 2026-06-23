"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Loader2,
  Globe,
  Clock,
  ArrowRight,
  ArrowDown,
  AlertCircle,
  Tag,
  Twitter,
  FileText,
  Copy,
  Check,
  Server,
  ShieldCheck,
  ShieldX,
  Lock,
  ClipboardPaste,
  Zap,
  Activity,
  History,
  Trash2,
  RotateCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

// ─── Types ─────────────────────────────────────────────────────────────────

interface RedirectHop {
  url: string;
  status: number;
}

interface OgTag {
  property: string;
  content: string;
}

type InspectSource = "server" | "fallback";

interface InspectResult {
  finalUrl: string;
  status: number;
  responseTimeMs: number;
  redirects: RedirectHop[];
  title: string | null;
  description: string | null;
  ogTags: OgTag[];
  twitterTags: OgTag[];
  source: InspectSource;
  // Health-check extras (server-side)
  content_type?: string | null;
  server_header?: string | null;
  ssl?: { valid: boolean; days_remaining: number | null; issuer: string | null } | null;
  https?: boolean;
  status_text?: string;
  error?: string;
}

interface ServerInspectResponse {
  ok: boolean;
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  responseTimeMs: number;
  redirectCount: number;
  redirectChain: { status: number; url: string }[];
  title: string | null;
  description: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  error?: string;
}

interface ServerHealthResponse {
  ok: boolean;
  url: string;
  final_url: string;
  status: number;
  status_text: string;
  response_time_ms: number;
  redirects: { status: number; location: string }[];
  content_type: string | null;
  server: string | null;
  ssl: { valid: boolean; days_remaining: number | null; issuer: string | null } | null;
  https: boolean;
  error?: string;
}

// ─── Inspect history (localStorage) ────────────────────────────────────────

interface HistoryItem {
  url: string;
  status: number;
  ts: number;
}

const HISTORY_KEY = "qlss-inspect-history";
const HISTORY_MAX = 6;

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x): x is HistoryItem =>
          x &&
          typeof x === "object" &&
          typeof x.url === "string" &&
          typeof x.status === "number" &&
          typeof x.ts === "number",
      )
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    // ignore quota errors
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Unified Inspect form — merges the old "inspect" and "check" tabs into a
 * single tool. Calls BOTH `/api/inspect` (for OG/Twitter meta + page title)
 * AND `/api/health-check` (for SSL, content-type, server header, status text)
 * in parallel, then merges the results into one rich card.
 */
export function InspectUnifiedForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load inspect history from localStorage on mount.
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // "/" focuses the input (when not typing in another field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function normalizeUrl(input: string): string | null {
    let u = input.trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try {
      new URL(u);
      return u;
    } catch {
      return null;
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      toast({
        title: t("home.clipboard_error"),
        description: t("home.clipboard_error_desc"),
        duration: 2000,
      });
    }
  }

  async function handleInspect(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setResult(null);

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError(t("health_check.error_invalid_url"));
      return;
    }

    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // Notify the top progress bar.
    window.dispatchEvent(new CustomEvent("qlss:fetch-start"));

    const start = performance.now();

    try {
      // Fire both requests in parallel.
      const [inspectRes, healthRes] = await Promise.allSettled([
        fetch(`/api/inspect?url=${encodeURIComponent(normalized)}`, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d as ServerInspectResponse }))),
        fetch("/api/health-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalized }),
          signal: ac.signal,
        }).then((r) => r.json().then((d) => d as ServerHealthResponse)),
      ]);

      if (inspectRes.status === "rejected" && healthRes.status === "rejected") {
        setError(t("health_check.error_fetch"));
        return;
      }

      // Build merged result.
      const merged: InspectResult = {
        finalUrl: normalized,
        status: 0,
        responseTimeMs: Math.round(performance.now() - start),
        redirects: [],
        title: null,
        description: null,
        ogTags: [],
        twitterTags: [],
        source: "server",
      };

      // Prefer health-check for status / SSL / headers.
      if (healthRes.status === "fulfilled") {
        const h = healthRes.value;
        merged.status = h.status;
        merged.status_text = h.status_text;
        merged.https = h.https;
        merged.ssl = h.ssl;
        merged.content_type = h.content_type;
        merged.server_header = h.server;
        merged.finalUrl = h.final_url || h.url;
        merged.redirects = Array.isArray(h.redirects)
          ? h.redirects.map((r) => ({ url: r.location, status: r.status }))
          : [];
        merged.error = h.error;
      }

      // Layer inspect data on top (OG tags, title, description).
      if (inspectRes.status === "fulfilled" && inspectRes.value.data) {
        const d = inspectRes.value.data;
        if (d.ok) {
          merged.finalUrl = d.finalUrl || merged.finalUrl;
          merged.status = merged.status || d.status;
          merged.responseTimeMs = d.responseTimeMs || merged.responseTimeMs;
          merged.title = d.title;
          merged.description = d.description;
          merged.ogTags = Object.entries(d.ogTags ?? {}).map(([property, content]) => ({
            property,
            content,
          }));
          merged.twitterTags = Object.entries(d.twitterTags ?? {}).map(([property, content]) => ({
            property,
            content,
          }));
          if (merged.redirects.length === 0 && Array.isArray(d.redirectChain)) {
            merged.redirects = d.redirectChain.map((h) => ({ url: h.url, status: h.status }));
          }
        } else if (!merged.status) {
          // Inspect failed and health-check also failed to give status.
          merged.status = d.status;
          merged.error = d.error;
        }
      }

      if (!merged.status && merged.error) {
        const errLower = (merged.error || "").toLowerCase();
        if (errLower.includes("timeout") || errLower.includes("aborted")) {
          setError(t("health_check.error_timeout"));
        } else {
          setError(t("health_check.error_fetch"));
        }
      }

      setResult(merged);

      // Save to local inspect history (most-recent first, deduped by URL,
      // capped at HISTORY_MAX entries). Privacy-respecting — never leaves
      // the browser.
      if (merged.status || merged.title || merged.finalUrl) {
        setHistory((prev) => {
          const without = prev.filter(
            (h) => h.url !== normalized && h.url !== merged.finalUrl,
          );
          const next: HistoryItem[] = [
            {
              url: merged.finalUrl || normalized,
              status: merged.status,
              ts: Date.now(),
            },
            ...without,
          ].slice(0, HISTORY_MAX);
          saveHistory(next);
          return next;
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(t("health_check.error_fetch"));
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  function reInspect(historyUrl: string) {
    setUrl(historyUrl);
    inputRef.current?.focus();
    // Defer the inspect call so the URL state has time to flush into the input.
    window.setTimeout(() => {
      void handleInspect();
    }, 0);
  }

  function formatHistoryTime(ts: number): string {
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return t("inspector.history_just_now");
    return t("inspector.history_minutes_ago").replace("{n}", String(diffMin));
  }

  function copyText(text: string, key: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(key);
        toast({
          title: t("common.copied"),
          description: t("common.copied_to_clipboard"),
        });
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => {
        toast({
          title: t("home.clipboard_error"),
          description: t("home.clipboard_error_desc"),
        });
      });
  }

  // ── Status badge styling ────────────────────────────────────────────────
  const statusColor = (status: number) => {
    if (status >= 200 && status < 300)
      return "text-emerald-600 dark:text-emerald-400";
    if (status >= 300 && status < 400) return "text-amber-600 dark:text-amber-400";
    if (status >= 400) return "text-destructive";
    return "text-muted-foreground";
  };

  function statusBadgeClasses(status: number, hasError: boolean): string {
    if (hasError || status === 0) {
      return "border-border bg-muted/40 text-muted-foreground";
    }
    if (status >= 200 && status < 300) {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    }
    if (status >= 300 && status < 400) {
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    }
    if (status >= 400 && status < 500) {
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    }
    if (status >= 500) {
      return "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400";
    }
    return "border-border bg-muted/40 text-muted-foreground";
  }

  function responseTimeClasses(ms: number): string {
    if (ms < 500) return "text-emerald-600 dark:text-emerald-400";
    if (ms < 2000) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  }

  function responseTimeLabel(ms: number): string {
    if (ms < 2000) return t("health_check.fast");
    return t("health_check.slow");
  }

  const hasError = !!error && !result;
  const redirectCount = result?.redirects?.length ?? 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleInspect} className="space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          <span className="text-foreground">&gt;</span>
          <Activity className="h-3 w-3" />
          <span>{t("inspector.input_label")}</span>
        </div>
        <div className="input-focus-glow flex items-stretch border border-border bg-card">
          <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">
            <Globe className="h-3.5 w-3.5" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("inspector.input_placeholder")}
            className="flex-1 bg-transparent border-0 outline-none py-2.5 sm:py-3 text-sm placeholder:text-muted-foreground/60 min-w-0 font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          {!url && !loading && (
            <button
              type="button"
              onClick={handlePaste}
              className="border-l border-border text-muted-foreground hover:text-foreground hover:bg-accent px-3 text-sm transition-colors touch-target btn-press"
              title={t("health_check.paste")}
              aria-label={t("health_check.paste")}
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn-press bg-foreground text-background hover:bg-foreground/90 px-3 sm:px-4 py-2.5 sm:py-3 text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{t("inspector.inspect_btn")}</span>
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          {t("inspector.hint")}
        </p>
      </form>

      {/* ── Local inspect history (localStorage only) ───────────────────── */}
      {!loading && !result && (
        <div className="border border-border bg-card/60 animate-fade-in">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <History className="h-3 w-3" />
              <span>{t("inspector.history_title")}</span>
              {history.length > 0 && (
                <span className="text-muted-foreground/60 normal-case tracking-normal font-mono">
                  · {history.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <>
                  <span className="text-[9px] text-muted-foreground/70 hidden sm:inline">
                    {t("inspector.history_stored_locally")}
                  </span>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 touch-target btn-press"
                    aria-label={t("inspector.history_clear")}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="uppercase tracking-widest">{t("inspector.history_clear")}</span>
                  </button>
                </>
              )}
            </div>
          </div>
          {history.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[11px] text-muted-foreground/70 italic">
                {t("inspector.history_empty")}
              </p>
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto custom-scroll divide-y divide-border/40">
              {history.map((h, i) => (
                <li key={`${h.url}-${i}`}>
                  <button
                    type="button"
                    onClick={() => reInspect(h.url)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors group"
                  >
                    <span
                      className={`shrink-0 tabular-nums font-mono text-[10px] font-bold px-1.5 py-0.5 border ${statusBadgeClasses(
                        h.status,
                        false,
                      )}`}
                    >
                      {h.status === 0 ? "—" : h.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground font-mono truncate group-hover:text-foreground">
                        {h.url}
                      </p>
                      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-widest">
                        {formatHistoryTime(h.ts)}
                      </p>
                    </div>
                    <RotateCw className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────────── */}
      {loading && (
        <Card className="p-4 gap-3 rounded-none animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="font-mono">{t("health_check.checking")}</span>
          </div>
          <div className="space-y-2">
            <div className="skeleton-shimmer h-8 w-full rounded-sm" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="skeleton-shimmer h-12 rounded-sm" />
              <div className="skeleton-shimmer h-12 rounded-sm" />
              <div className="skeleton-shimmer h-12 rounded-sm" />
              <div className="skeleton-shimmer h-12 rounded-sm" />
            </div>
          </div>
        </Card>
      )}

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && !loading && !result && (
        <div className="border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-start gap-2 animate-page-enter">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-3 animate-page-enter">
          {/* Status banner */}
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 border border-border bg-card card-hover ${statusBadgeClasses(
              result.status,
              hasError,
            )}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl font-bold tabular-nums leading-none font-mono">
                {result.status === 0 ? "—" : result.status}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest opacity-70">
                  {t("health_check.status")}
                </div>
                <div className="text-xs font-mono truncate opacity-90">
                  {result.status_text || (hasError ? "error" : "ok")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {result.https && (
                <Badge
                  variant="outline"
                  className="border-border bg-background/50 text-foreground gap-1"
                >
                  <Lock className="h-3 w-3" />
                  <span className="font-mono">{t("health_check.https")}</span>
                </Badge>
              )}
              {result.ssl && (
                <Badge
                  variant="outline"
                  className={
                    result.ssl.valid
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 gap-1"
                  }
                  title={t("health_check.ssl")}
                >
                  {result.ssl.valid ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <ShieldX className="h-3 w-3" />
                  )}
                  <span className="font-mono">
                    {result.ssl.valid
                      ? t("health_check.ssl_valid")
                      : t("health_check.ssl_invalid")}
                  </span>
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-border bg-background/50 text-foreground gap-1"
              >
                <Server className="h-3 w-3" />
                <span className="font-mono">{t("inspector.source_server")}</span>
              </Badge>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            {/* Response time */}
            <div className="bg-card p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t("health_check.response_time")}</span>
              </div>
              <div
                className={`text-base font-bold tabular-nums font-mono ${responseTimeClasses(
                  result.responseTimeMs,
                )}`}
              >
                {result.responseTimeMs}
                <span className="text-[10px] ml-0.5 opacity-70">
                  {t("health_check.ms_suffix")}
                </span>
              </div>
              <div
                className={`text-[10px] flex items-center gap-1 ${responseTimeClasses(
                  result.responseTimeMs,
                )}`}
              >
                <Zap className="h-2.5 w-2.5" />
                {responseTimeLabel(result.responseTimeMs)}
              </div>
            </div>

            {/* Redirect count */}
            <div className="bg-card p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                <span>{t("health_check.redirects")}</span>
              </div>
              <div className="text-base font-bold tabular-nums font-mono text-foreground">
                {redirectCount}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">
                {redirectCount === 0
                  ? t("health_check.no_redirects")
                  : t("health_check.redirect_count").replace(
                      "{{count}}",
                      String(redirectCount),
                    )}
              </div>
            </div>

            {/* Content-Type */}
            <div className="bg-card p-3 flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{t("health_check.content_type")}</span>
              </div>
              <div
                className="text-xs font-mono text-foreground truncate"
                title={result.content_type ?? ""}
              >
                {result.content_type ? (
                  result.content_type.split(";")[0].trim()
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">
                {result.content_type
                  ? result.content_type.split(";")[1]?.trim() ?? ""
                  : ""}
              </div>
            </div>

            {/* Server */}
            <div className="bg-card p-3 flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Server className="h-3 w-3" />
                <span>{t("health_check.server")}</span>
              </div>
              <div
                className="text-xs font-mono text-foreground truncate"
                title={result.server_header ?? ""}
              >
                {result.server_header ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {result.ssl?.issuer ? `ssl: ${result.ssl.issuer}` : ""}
              </div>
            </div>
          </div>

          {/* Final URL with copy */}
          <div className="border border-border bg-card p-3 flex items-center gap-2 card-hover">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                {t("inspector.result_final_url")}
              </p>
              <p className="text-xs text-foreground font-mono break-all">{result.finalUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(result.finalUrl, "finalUrl")}
              title={t("common.copy")}
              className="btn-press p-2 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
            >
              {copied === "finalUrl" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Redirect chain */}
          {redirectCount > 0 && (
            <div className="border border-border bg-card p-4 card-hover">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3" />
                {t("inspector.result_redirects")}
              </p>
              <ol className="space-y-1.5 max-h-96 overflow-y-auto">
                {result.redirects.map((hop, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`tabular-nums font-medium ${statusColor(hop.status)}`}
                    >
                      {hop.status}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground truncate flex-1 font-mono">
                      {hop.url}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Page metadata (title & description) */}
          {(result.title || result.description) && (
            <div className="border border-border bg-card p-4 space-y-2 card-hover">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                {t("inspector.page_title")}
              </p>
              {result.title && (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                      {t("inspector.result_title")}
                    </p>
                    <p className="text-xs text-foreground break-words">{result.title}</p>
                  </div>
                </div>
              )}
              {result.description && (
                <div
                  className={`flex items-start gap-2 ${
                    result.title ? "pt-2 border-t border-border/50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                      {t("inspector.result_description")}
                    </p>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OG tags */}
          <div className="border border-border bg-card p-4 card-hover">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              {t("inspector.result_og_tags")}
            </p>
            {result.ogTags.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("inspector.no_og")}
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-96 overflow-y-auto">
                {result.ogTags.map((tag, i) => (
                  <li key={i} className="text-[11px] flex items-start gap-2">
                    <code className="text-foreground bg-accent px-1.5 py-0.5 text-[10px] shrink-0">
                      {tag.property}
                    </code>
                    <span className="text-muted-foreground break-all flex-1">
                      {tag.content}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Twitter tags */}
          <div className="border border-border bg-card p-4 card-hover">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Twitter className="h-3 w-3" />
              {t("inspector.result_twitter_tags")}
            </p>
            {result.twitterTags.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("inspector.no_twitter")}
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-96 overflow-y-auto">
                {result.twitterTags.map((tag, i) => (
                  <li key={i} className="text-[11px] flex items-start gap-2">
                    <code className="text-foreground bg-accent px-1.5 py-0.5 text-[10px] shrink-0">
                      {tag.property}
                    </code>
                    <span className="text-muted-foreground break-all flex-1">
                      {tag.content}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Error details (when we have a partial result with an error) */}
          {result.error && (
            <div className="px-4 py-2 border border-destructive/20 bg-destructive/5">
              <div className="text-[10px] uppercase tracking-widest text-destructive mb-0.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                <span>error</span>
              </div>
              <code className="text-[11px] font-mono text-destructive break-all leading-relaxed">
                {result.error}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
