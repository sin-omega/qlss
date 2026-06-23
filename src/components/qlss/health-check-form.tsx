"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Loader2,
  ClipboardPaste,
  Copy,
  Check,
  Globe,
  Clock,
  ShieldCheck,
  ShieldX,
  Lock,
  Server,
  FileText,
  ArrowDown,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

interface RedirectHop {
  status: number;
  location: string;
}

interface HealthCheckResult {
  ok: boolean;
  url: string;
  final_url: string;
  status: number;
  status_text: string;
  response_time_ms: number;
  redirects: RedirectHop[];
  content_type: string | null;
  server: string | null;
  ssl: { valid: boolean; days_remaining: number | null; issuer: string | null } | null;
  https: boolean;
  error?: string;
}

/**
 * URL Health Check — pings a URL server-side, follows up to 5 redirects
 * manually, and surfaces status / response time / SSL / redirect chain /
 * content-type / server headers in a compact terminal-style card.
 */
export function HealthCheckForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  async function handleCheck(e?: React.FormEvent) {
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

    try {
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
        signal: ac.signal,
      });

      let data: HealthCheckResult | null = null;
      try {
        data = (await res.json()) as HealthCheckResult;
      } catch {
        data = null;
      }

      if (!data) {
        setError(t("health_check.error_fetch"));
        return;
      }

      // Distinguish timeout vs generic fetch failure for friendlier messages.
      if (!data.ok && data.error) {
        const errLower = data.error.toLowerCase();
        if (
          errLower.includes("timeout") ||
          errLower.includes("aborted") ||
          errLower.includes("timed out")
        ) {
          setError(t("health_check.error_timeout"));
          setResult(data);
          return;
        }
        // For other errors (DNS, connection refused, cert errors, etc.) we
        // still surface the result so the user can see what we learned — but
        // show the friendly fetch-failed message.
        setError(t("health_check.error_fetch"));
        setResult(data);
        return;
      }

      setResult(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(t("health_check.error_fetch"));
    } finally {
      setLoading(false);
    }
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

  // ── Response time colour coding ────────────────────────────────────────
  function responseTimeClasses(ms: number): string {
    if (ms < 500) {
      return "text-emerald-600 dark:text-emerald-400";
    }
    if (ms < 2000) {
      return "text-amber-600 dark:text-amber-400";
    }
    return "text-rose-600 dark:text-rose-400";
  }

  function responseTimeLabel(ms: number): string {
    if (ms < 500) return t("health_check.fast");
    if (ms < 2000) return t("health_check.fast");
    return t("health_check.slow");
  }

  const hasError = !!error;
  const redirectCount = result?.redirects?.length ?? 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleCheck} className="space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          <span className="text-foreground">&gt;</span>
          <Activity className="h-3 w-3" />
          <span>{t("health_check.title")}</span>
        </div>
        <p className="text-[11px] text-muted-foreground italic -mt-2">
          {t("health_check.subtitle")}
        </p>

        <div className="input-focus-glow flex items-stretch border border-border bg-card">
          <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">
            <Globe className="h-3.5 w-3.5" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("health_check.placeholder")}
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
              <Activity className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{t("health_check.btn")}</span>
          </button>
        </div>
      </form>

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
            <div className="skeleton-shimmer h-6 w-3/4 rounded-sm" />
          </div>
        </Card>
      )}

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-start gap-2 animate-page-enter">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Result card ───────────────────────────────────────────────── */}
      {result && !loading && (
        <Card className="p-0 gap-0 rounded-none border-border bg-card text-foreground animate-page-enter overflow-hidden">
          {/* Status banner */}
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-border ${statusBadgeClasses(
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
            <div className="flex items-center gap-1.5 shrink-0">
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
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
            {/* Response time */}
            <div className="bg-card p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t("health_check.response_time")}</span>
              </div>
              <div
                className={`text-base font-bold tabular-nums font-mono ${responseTimeClasses(
                  result.response_time_ms,
                )}`}
              >
                {result.response_time_ms}
                <span className="text-[10px] ml-0.5 opacity-70">
                  {t("health_check.ms_suffix")}
                </span>
              </div>
              <div
                className={`text-[10px] flex items-center gap-1 ${responseTimeClasses(
                  result.response_time_ms,
                )}`}
              >
                <Zap className="h-2.5 w-2.5" />
                {responseTimeLabel(result.response_time_ms)}
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
                title={result.server ?? ""}
              >
                {result.server ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {result.server ? "" : ""}
              </div>
            </div>
          </div>

          {/* Final URL with copy */}
          <div className="px-4 py-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              <span>{t("health_check.final_url")}</span>
              {redirectCount > 0 && (
                <Badge
                  variant="outline"
                  className="ml-auto border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] py-0 px-1.5"
                >
                  {t("health_check.redirect_count").replace(
                    "{{count}}",
                    String(redirectCount),
                  )}
                </Badge>
              )}
            </div>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 min-w-0 px-3 py-2 bg-background border border-border text-xs font-mono text-foreground break-all leading-relaxed">
                {result.final_url || result.url}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  copyText(result.final_url || result.url, "final_url")
                }
                className="px-2.5 shrink-0"
                aria-label={t("health_check.copy")}
                title={t("health_check.copy")}
              >
                {copied === "final_url" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Redirect chain */}
          {redirectCount > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <ArrowDown className="h-3 w-3" />
                <span>{t("health_check.redirects")}</span>
              </div>
              <ol className="space-y-1.5">
                {/* Original URL */}
                <li className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums pt-0.5 shrink-0 w-6 text-right">
                    00
                  </span>
                  <code className="flex-1 min-w-0 px-2 py-1 bg-background border border-border text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
                    {result.url}
                  </code>
                </li>
                {result.redirects.map((hop, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums pt-0.5 shrink-0 w-6 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[9px] py-0 px-1.5"
                        >
                          {hop.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          →
                        </span>
                      </div>
                      <code className="block px-2 py-1 bg-background border border-border text-[11px] font-mono text-foreground break-all leading-relaxed">
                        {hop.location}
                      </code>
                    </div>
                  </li>
                ))}
                {/* Final URL hop */}
                <li className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums pt-0.5 shrink-0 w-6 text-right">
                    {String(redirectCount + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <Badge
                        variant="outline"
                        className={`font-mono text-[9px] py-0 px-1.5 ${statusBadgeClasses(
                          result.status,
                          false,
                        )}`}
                      >
                        {result.status === 0 ? "—" : result.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ✓
                      </span>
                    </div>
                    <code className="block px-2 py-1 bg-background border border-emerald-500/30 text-[11px] font-mono text-foreground break-all leading-relaxed">
                      {result.final_url}
                    </code>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Error details (when we have a partial result with an error) */}
          {result.error && (
            <div className="px-4 py-2 border-t border-border bg-destructive/5">
              <div className="text-[10px] uppercase tracking-widest text-destructive mb-0.5 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                <span>error</span>
              </div>
              <code className="text-[11px] font-mono text-destructive break-all leading-relaxed">
                {result.error}
              </code>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
