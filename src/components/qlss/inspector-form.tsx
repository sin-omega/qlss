"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Loader2,
  Globe,
  Clock,
  ArrowRight,
  AlertCircle,
  Tag,
  Twitter,
  FileText,
  Copy,
  Check,
  Server,
  Wifi,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

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
}

/** Shape returned by GET /api/inspect?url=... */
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

/**
 * URL Inspector — tries our own server-side `/api/inspect` endpoint first
 * (no CORS, real User-Agent, real redirect chain), and only falls back to a
 * chain of public CORS proxies (allorigins, corsproxy, codetabs) when the
 * server endpoint itself is unreachable (network error, 5xx). The result
 * always shows where the data came from via a small "server" / "fallback"
 * badge.
 */
export function InspectorForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Keyboard shortcut: "/" focuses the input
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

  function mapServerResult(data: ServerInspectResponse): InspectResult {
    return {
      finalUrl: data.finalUrl || data.url,
      status: data.status,
      responseTimeMs: data.responseTimeMs,
      redirects: Array.isArray(data.redirectChain)
        ? data.redirectChain.map((h) => ({ url: h.url, status: h.status }))
        : [],
      title: data.title,
      description: data.description,
      ogTags: Object.entries(data.ogTags ?? {}).map(([property, content]) => ({
        property,
        content,
      })),
      twitterTags: Object.entries(data.twitterTags ?? {}).map(
        ([property, content]) => ({ property, content }),
      ),
      source: "server",
    };
  }

  /** Client-side CORS-proxy fallback chain (kept identical to the original). */
  async function fetchViaClientProxies(
    normalized: string,
    start: number,
  ): Promise<InspectResult> {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(normalized)}`,
      `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(normalized)}`,
    ];
    let res: Response | null = null;
    let html = "";
    let lastErr: unknown = null;
    for (const proxyUrl of proxies) {
      try {
        const r = await fetch(proxyUrl, {
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) {
          lastErr = new Error(`proxy ${r.status}`);
          continue;
        }
        const text = await r.text();
        if (!text || text.length < 10) {
          lastErr = new Error("empty response");
          continue;
        }
        res = r;
        html = text;
        break;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }
    if (!res || !html) {
      throw lastErr instanceof Error ? lastErr : new Error("All proxies failed");
    }
    const responseTimeMs = Math.round(performance.now() - start);

    const finalUrl = res.url || normalized;
    const redirects: RedirectHop[] =
      finalUrl !== normalized
        ? [
            { url: normalized, status: 301 },
            { url: finalUrl, status: res.status },
          ]
        : [{ url: finalUrl, status: res.status }];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const title = doc.querySelector("title")?.textContent?.trim() ?? null;
    const description =
      doc
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() ?? null;

    const ogTags: OgTag[] = [];
    doc.querySelectorAll('meta[property^="og:"]').forEach((el) => {
      const property = el.getAttribute("property");
      const content = el.getAttribute("content");
      if (property && content) ogTags.push({ property, content });
    });

    const twitterTags: OgTag[] = [];
    doc.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
      const name = el.getAttribute("name");
      const content = el.getAttribute("content");
      if (name && content) twitterTags.push({ property: name, content });
    });

    return {
      finalUrl,
      status: res.status,
      responseTimeMs,
      redirects,
      title,
      description,
      ogTags,
      twitterTags,
      source: "fallback",
    };
  }

  async function handleInspect(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setResult(null);

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError(t("auth.err_invalid_email").replace("email", "url"));
      return;
    }

    setLoading(true);
    const start = performance.now();
    let fallbackNoticeShown = false;

    try {
      // ── 1. Try the server-side inspector first ──────────────────────
      let serverResult: InspectResult | null = null;
      let serverError: string | null = null;
      try {
        const r = await fetch(
          `/api/inspect?url=${encodeURIComponent(normalized)}`,
          {
            signal: AbortSignal.timeout(12000),
            headers: { Accept: "application/json" },
          },
        );

        // 2xx or 4xx → the endpoint itself responded → use its payload.
        // 5xx → endpoint is broken → fall through to client-side fallback.
        if (r.ok || (r.status >= 400 && r.status < 500)) {
          let data: ServerInspectResponse | null = null;
          try {
            data = (await r.json()) as ServerInspectResponse;
          } catch {
            data = null;
          }

          if (data) {
            const isTimeout = !data.ok && data.error === "timeout";
            if (!isTimeout) {
              // ok:true, or ok:false with a non-timeout error → trust the
              // server (it has a real User-Agent and no CORS restrictions,
              // so a failure here means the URL itself is unreachable, not a
              // CORS issue). Surface the server's error message if any.
              serverResult = mapServerResult(data);
              if (!data.ok && data.error) {
                serverError = data.error;
              }
            }
            // else: timeout → leave serverResult null → fall back.
          }
        }
      } catch {
        // Network error reaching /api/inspect → fall through to fallback.
      }

      // ── 2. Fall back to client-side CORS proxies if needed ──────────
      if (!serverResult) {
        try {
          const fallbackResult = await fetchViaClientProxies(
            normalized,
            start,
          );
          // Tell the user we couldn't reach our own server endpoint.
          fallbackNoticeShown = true;
          setResult(fallbackResult);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      } else {
        setResult(serverResult);
        if (serverError) setError(serverError);
      }

      if (fallbackNoticeShown) {
        toast({
          title: t("inspector.server_fetch_failed"),
          description: t("inspector.using_fallback"),
        });
      }
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

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300)
      return "text-emerald-600 dark:text-emerald-400";
    if (status >= 300 && status < 400) return "text-amber-600 dark:text-amber-400";
    if (status >= 400) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleInspect} className="space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          <span className="text-foreground">&gt;</span>
          <span>{t("inspector.input_label")}</span>
        </div>
        <div className="input-focus-glow flex items-center border border-border bg-card">
          <span className="pl-3 pr-2 text-muted-foreground select-none text-sm">
            <Globe className="h-3.5 w-3.5" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("inspector.input_placeholder")}
            className="flex-1 bg-transparent border-0 outline-none py-2.5 sm:py-3 text-sm placeholder:text-muted-foreground/60 min-w-0"
            autoComplete="off"
            spellCheck={false}
          />
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

      {error && (
        <div className="border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-start gap-2 animate-page-enter">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3 animate-page-enter">
          {/* Source badge + fallback notice */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-widest border ${
                result.source === "server"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
              title={
                result.source === "server"
                  ? t("inspector.source_server")
                  : t("inspector.using_fallback")
              }
            >
              {result.source === "server" ? (
                <Server className="h-3 w-3" />
              ) : (
                <Wifi className="h-3 w-3" />
              )}
              {result.source === "server"
                ? t("inspector.source_server")
                : t("inspector.using_fallback")}
            </span>
            {result.source === "fallback" && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                {t("inspector.server_fetch_failed")}
              </span>
            )}
          </div>

          {/* Status row */}
          <div className="border border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              icon={<Globe className="h-3 w-3" />}
              label={t("inspector.result_status")}
              value={
                <span className={`tabular-nums ${statusColor(result.status)}`}>
                  {result.status}
                </span>
              }
            />
            <Stat
              icon={<Clock className="h-3 w-3" />}
              label={t("inspector.result_response_time")}
              value={
                <span className="tabular-nums">
                  {result.responseTimeMs}
                  <span className="text-muted-foreground text-[10px] ml-0.5">
                    ms
                  </span>
                </span>
              }
            />
            <Stat
              icon={<ArrowRight className="h-3 w-3" />}
              label={t("inspector.result_redirects")}
              value={
                <span className="tabular-nums">
                  {Math.max(0, result.redirects.length - 1)}
                </span>
              }
              className="col-span-2 sm:col-span-1"
            />
            <Stat
              icon={<Tag className="h-3 w-3" />}
              label="OG"
              value={<span className="tabular-nums">{result.ogTags.length}</span>}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          {/* Final URL */}
          <ResultRow
            label={t("inspector.result_final_url")}
            value={result.finalUrl}
            onCopy={() => copyText(result.finalUrl, "finalUrl")}
            copied={copied === "finalUrl"}
          />

          {/* Redirect chain */}
          <div className="border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3" />
              {t("inspector.result_redirects")}
            </p>
            {result.redirects.length <= 1 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("inspector.no_redirects")}
              </p>
            ) : (
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
            )}
          </div>

          {/* Page metadata (title & description) */}
          {(result.title || result.description) && (
            <div className="border border-border bg-card p-4 space-y-2">
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
                    <p className="text-xs text-foreground break-words">
                      {result.title}
                    </p>
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
          <div className="border border-border bg-card p-4">
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
          <div className="border border-border bg-card p-4">
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
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="border border-border bg-card p-3 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
          {label}
        </p>
        <p className="text-xs text-foreground font-mono break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        title={t("common.copy")}
        className="btn-press p-2 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
