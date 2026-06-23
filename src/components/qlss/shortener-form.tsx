"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Lock,
  QrCode,
  X,
  Ban,
  ClipboardPaste,
  Share2,
  KeyRound,
  Timer,
  Tag,
  FileText,
  Code,
  Braces,
  Layers,
  Sparkles,
  Loader2,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";
import { BulkForm } from "@/components/qlss/bulk-form";
import { QrCodeModal } from "@/components/qlss/qr-code-modal";
import { t, getLanguage } from "@/lib/i18n";

interface CreatedLink {
  slug: string;
  short_url: string;
  destination_url: string;
  owner: boolean;
}

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

const EXPIRY_OPTIONS: { key: string; seconds: number | null }[] = [
  { key: "expiry.never", seconds: null },
  { key: "expiry.1_hour", seconds: 3600 },
  { key: "expiry.24_hours", seconds: 86400 },
  { key: "expiry.7_days", seconds: 604800 },
  { key: "expiry.30_days", seconds: 2592000 },
  { key: "expiry.90_days", seconds: 7776000 },
];

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeUrl(str: string): boolean {
  if (str.length < 3) return false;
  // Accept URLs with or without protocol
  const withProto = str.startsWith("http://") || str.startsWith("https://") ? str : `https://${str}`;
  return isValidUrl(withProto);
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname;
  } catch {
    return "";
  }
}

function buildUrlWithUtm(baseUrl: string, utm: UTMParams): string {
  const params: string[] = [];
  if (utm.source.trim()) params.push(`utm_source=${encodeURIComponent(utm.source.trim())}`);
  if (utm.medium.trim()) params.push(`utm_medium=${encodeURIComponent(utm.medium.trim())}`);
  if (utm.campaign.trim()) params.push(`utm_campaign=${encodeURIComponent(utm.campaign.trim())}`);
  if (utm.term.trim()) params.push(`utm_term=${encodeURIComponent(utm.term.trim())}`);
  if (utm.content.trim()) params.push(`utm_content=${encodeURIComponent(utm.content.trim())}`);
  if (params.length === 0) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return baseUrl + separator + params.join("&");
}

function hasAnyUtm(utm: UTMParams): boolean {
  return Boolean(
    utm.source.trim() || utm.medium.trim() || utm.campaign.trim() || utm.term.trim() || utm.content.trim()
  );
}

function formatExpiryDate(seconds: number): string {
  const d = new Date(Date.now() + seconds * 1000);
  const lang = getLanguage();
  const locale = lang === "en" ? "en-US" : "pl-PL";
  const dateStr = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
  return `${t("home.expires_prefix")}${dateStr}`;
}

function getDestinationTitle(url: string): string {
  try {
    const u = new URL(url);
    // Use hostname as the title
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

/** Generate confetti particle inline styles */
function getConfettiParticles(count: number) {
  const colors = ["#0c0c0a", "#6a6a64", "#b08a3e", "#2c6e49", "#8c4040", "#b4b3aa"];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    const distance = 30 + Math.random() * 50;
    const tx = Math.cos((angle * Math.PI) / 180) * distance;
    const ty = Math.sin((angle * Math.PI) / 180) * distance - 20;
    const tr = Math.random() * 720 - 360;
    return {
      color: colors[i % colors.length],
      tx: `${tx}px`,
      ty: `${ty}px`,
      tr: `${tr}deg`,
      delay: `${Math.random() * 0.15}s`,
    };
  });
}

/**
 * Shortener form — same for authed and unauthed.
 */
export function ShortenerForm({ signedIn }: { signedIn: boolean }) {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [typedUrl, setTypedUrl] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [pincode, setPincode] = useState("");
  const [utmOpen, setUtmOpen] = useState(false);
  const [utm, setUtm] = useState<UTMParams>({ source: "", medium: "", campaign: "", term: "", content: "" });
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiryIndex, setExpiryIndex] = useState(0); // index into EXPIRY_OPTIONS, default "never"
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  // New: max uses, OG meta, bulk mode
  const [maxUses, setMaxUses] = useState<string>("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  // URL metadata preview
  const [previewData, setPreviewData] = useState<{
    title: string;
    description: string;
    favicon: string;
    domain: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  // Web Share API support
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  // Loading skeleton — show for 300ms on mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Debounced slug availability checker
  useEffect(() => {
    if (!alias || !signedIn) {
      setSlugAvailable(null);
      setSlugChecking(false);
      return;
    }

    setSlugChecking(true);
    setSlugAvailable(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/${alias}`, { method: "HEAD" });
        // 404 = slug available (no existing link), 200 = taken
        setSlugAvailable(res.status === 404);
      } catch {
        // Network error — don't show a definitive result
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [alias, signedIn]);

  // URL validation state
  const urlValidation = useMemo(() => {
    if (url.length < 3) return null;
    return looksLikeUrl(url) ? "valid" : "invalid";
  }, [url]);

  // Debounced URL metadata preview fetcher
  const fetchPreview = useCallback(async (targetUrl: string) => {
    // Cancel any in-flight request
    previewAbortRef.current?.abort();
    const ac = new AbortController();
    previewAbortRef.current = ac;

    setPreviewLoading(true);
    setPreviewError(false);
    setPreviewData(null);

    try {
      const res = await fetch(
        `/api/preview?url=${encodeURIComponent(targetUrl)}`,
        { signal: ac.signal },
      );
      if (ac.signal.aborted) return;
      const json = await res.json();
      if (json.ok) {
        setPreviewData({
          title: json.title || "",
          description: json.description || "",
          favicon: json.favicon || "",
          domain: json.domain || "",
        });
      } else {
        setPreviewError(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPreviewError(true);
    } finally {
      if (!ac.signal.aborted) {
        setPreviewLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Only fetch when URL is valid
    if (!url || urlValidation !== "valid") {
      setPreviewData(null);
      setPreviewLoading(false);
      setPreviewError(false);
      previewAbortRef.current?.abort();
      return;
    }

    const normalized = normalizeUrl(url);

    const timer = setTimeout(() => {
      fetchPreview(normalized);
    }, 800);

    return () => {
      clearTimeout(timer);
      previewAbortRef.current?.abort();
    };
  }, [url, urlValidation, fetchPreview]);

  // Full URL with UTM params (for preview and API)
  const fullUrlWithUtm = useMemo(() => {
    if (!url) return "";
    const normalized = normalizeUrl(url);
    return buildUrlWithUtm(normalized, utm);
  }, [url, utm]);

  // URL preview data
  const urlPreview = useMemo(() => {
    if (!url || urlValidation !== "valid") return null;
    const normalized = normalizeUrl(url);
    const domain = extractDomain(normalized);
    const hasUtm = hasAnyUtm(utm);
    return {
      domain,
      length: hasUtm ? fullUrlWithUtm.length : normalized.length,
      hasUtm,
    };
  }, [url, urlValidation, fullUrlWithUtm, utm]);

  // Expiry computed
  const expiryOption = EXPIRY_OPTIONS[expiryIndex];

  // Typewriter effect for created short URL
  useEffect(() => {
    if (!created) {
      setTypedUrl("");
      return;
    }
    setTypedUrl("");
    const chars = created.short_url.split("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < chars.length) {
        setTypedUrl(chars.slice(0, i + 1).join(""));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [created]);

  // Success animations trigger
  useEffect(() => {
    if (created) {
      setShowConfetti(true);
      setShowCheckmark(true);
      const t = setTimeout(() => setShowConfetti(false), 800);
      return () => {
        clearTimeout(t);
      };
    }
  }, [created]);

  // Error shake trigger
  useEffect(() => {
    if (error) {
      setErrorShake(true);
      const t = setTimeout(() => setErrorShake(false), 600);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Close copy menu on outside click
  useEffect(() => {
    if (!copyMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [copyMenuOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K or / to focus input (only on home page, not in an input already)
      if (
        (e.key === "/" || (e.ctrlKey && e.key === "k")) &&
        !created &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear
      if (e.key === "Escape" && !created) {
        setUrl("");
        setAlias("");
        setPincode("");
        setError(null);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [created]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setBusy(true);

    try {
      const normalizedUrl = normalizeUrl(url);
      const urlToSend = hasAnyUtm(utm) ? fullUrlWithUtm : normalizedUrl;
      const body: Record<string, unknown> = {
        destination_url: urlToSend,
        custom_slug: signedIn && alias ? alias : undefined,
        pincode: pincode ? pincode : undefined,
      };
      if (expiryOption.seconds !== null) {
        body.expires_in = expiryOption.seconds;
      }
      const mu = parseInt(maxUses, 10);
      if (Number.isFinite(mu) && mu > 0) {
        body.max_uses = mu;
      }
      if (ogTitle.trim()) body.og_title = ogTitle.trim();
      if (ogDescription.trim()) body.og_description = ogDescription.trim();
      if (ogImage.trim()) body.og_image = ogImage.trim();

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? t("home.create_failed"));
        return;
      }

      const linkData = json as CreatedLink;
      setCreated(linkData);
      setUrl("");
      setAlias("");
      setPincode("");
      setUtm({ source: "", medium: "", campaign: "", term: "", content: "" });
      setExpiryIndex(0);
      setUtmOpen(false);
      setExpiryOpen(false);
      setMaxUses("");
      setOgTitle("");
      setOgDescription("");
      setOgImage("");

      // Dispatch a custom event so the LocalHistory component (decoupled) can
      // pick up this newly-created link and prepend it to its localStorage list.
      if (typeof window !== "undefined" && linkData.slug && linkData.short_url) {
        try {
          window.dispatchEvent(
            new CustomEvent("qlss:local-history-add", {
              detail: {
                slug: linkData.slug,
                short_url: linkData.short_url,
                destination_url: linkData.destination_url,
                created_at: Date.now(),
              },
            })
          );
        } catch {
          // ignore dispatch errors
        }
      }

      if (!linkData.owner && linkData.slug) {
        try {
          const key = "qlss:anonymous_slugs";
          const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
          if (!existing.includes(linkData.slug)) {
            existing.push(linkData.slug);
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {
          // localStorage unavailable
        }
      }
    } catch {
      setError(t("home.network_error"));
    } finally {
      setBusy(false);
    }
  }

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: t("common.copied"),
        description: label,
        duration: 2000,
      });
      setCopyMenuOpen(false);
    }).catch(() => {
      // ignore
    });
  }

  function handleCopyToast(shortUrl: string) {
    handleCopyText(shortUrl, t("home.link_copied"));
  }

  async function handleShare(shortUrl: string) {
    if (canShare) {
      try {
        await navigator.share({
          title: t("home.short_link"),
          url: shortUrl,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyText(shortUrl, t("home.link_copied"));
    }
  }

  function handleReset() {
    setCreated(null);
    setError(null);
    setShowQR(false);
    setQrModalOpen(false);
    setTypedUrl("");
    setShowConfetti(false);
    setShowCheckmark(false);
    setPincode("");
    setUtm({ source: "", medium: "", campaign: "", term: "", content: "" });
    setExpiryIndex(0);
    setUtmOpen(false);
    setExpiryOpen(false);
    setCopyMenuOpen(false);
    setPreviewData(null);
    setPreviewLoading(false);
    setPreviewError(false);
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
        <div className="border border-border bg-card h-[34px]">
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="skeleton-shimmer h-2.5 w-24 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Result state — replaces the input
  // ---------------------------------------------------------------------
  if (created) {
    const confettiParticles = getConfettiParticles(16);
    const originalLength = created.destination_url.length;
    const shortLength = created.short_url.length;
    const charsSaved = originalLength - shortLength;
    const percentShorter = originalLength > 0 ? Math.round((charsSaved / originalLength) * 100) : 0;
    const destTitle = getDestinationTitle(created.destination_url);

    return (
      <div className="w-full space-y-3 animate-fade-in">
        <div className="border border-border bg-card relative card-hover">
          {/* Confetti burst */}
          {showConfetti && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              {confettiParticles.map((p, i) => (
                <span
                  key={i}
                  className="confetti-particle"
                  style={{
                    backgroundColor: p.color,
                    "--tx": p.tx,
                    "--ty": p.ty,
                    "--tr": p.tr,
                    animationDelay: p.delay,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              {showCheckmark && (
                <span className="animate-checkmark-pop inline-flex">
                  <Check className="h-3 w-3" style={{ color: "#2c6e49" }} />
                </span>
              )}
              {t("home.result")}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              {t("home.new_link")}
            </button>
          </div>
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <a
                href={created.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline break-all font-medium"
              >
                {typedUrl}
              </a>
              <p className="mt-1 text-xs text-muted-foreground break-all">
                -&gt; {created.destination_url}
              </p>
              {/* URL length savings */}
              {charsSaved > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("home.saved_chars")
                    .replace("{n}", String(charsSaved))
                    .replace("{p}", String(percentShorter))}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowQR((q) => !q)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 border border-border bg-background hover:bg-accent touch-target"
                title={t("home.show_qr_code")}
              >
                <QrCode className="h-3.5 w-3.5" />
              </button>
              {/* Copy button with dropdown */}
              <div className="relative" ref={copyMenuRef}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleCopyToast(created.short_url)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 border border-border bg-background hover:bg-accent touch-target rounded-none rounded-l-sm"
                  >
                    <Copy className="h-3 w-3" /> {t("home.copy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyMenuOpen((o) => !o)}
                    className="text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1.5 border border-l-0 border-border bg-background hover:bg-accent touch-target rounded-none rounded-r-sm"
                    title={t("home.copy_format_options")}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                {/* Copy format dropdown */}
                {copyMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 border border-border bg-card min-w-[180px] animate-fade-in shadow-md">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(created.short_url, t("home.url_copied"))
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      {t("home.copy_url")}
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `[${destTitle}](${created.short_url})`,
                          t("home.markdown_copied")
                        )
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      {t("home.copy_markdown")}
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `<a href="${created.short_url}">${destTitle}</a>`,
                          t("home.html_copied")
                        )
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Code className="h-3 w-3 shrink-0" />
                      {t("home.copy_html")}
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          JSON.stringify(
                            { slug: created.slug, short_url: created.short_url, destination_url: created.destination_url },
                            null,
                            2
                          ),
                          t("home.json_copied")
                        )
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Braces className="h-3 w-3 shrink-0" />
                      {t("home.copy_json")}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleShare(created.short_url)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 border border-border bg-background hover:bg-accent touch-target"
                title={t("home.share")}
              >
                <Share2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* QR Code overlay — compact inline preview + customize / download via modal */}
        {showQR && (
          <div className="border border-border bg-card p-4 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              title={t("qr_modal.open_modal")}
              className="group block p-2 bg-white border border-border hover:border-foreground/40 transition-colors btn-press cursor-pointer"
            >
              <QRCodeSVG
                value={created.short_url}
                size={64}
                level="M"
                bgColor="#ffffff"
                fgColor="#0c0c0a"
              />
            </button>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("home.scan_to_visit")}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs touch-target btn-press"
                title={t("qr_modal.open_modal")}
              >
                <QrCode className="h-3 w-3" /> {t("qr_modal.customize")}
              </button>
              <button
                type="button"
                onClick={() => setShowQR(false)}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs touch-target"
              >
                <X className="h-3 w-3" /> {t("home.hide")}
              </button>
            </div>
          </div>
        )}

        {/* Full QR customization modal */}
        <QrCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          url={created.short_url}
        />

        {!created.owner && (
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            {t("home.unclaimed")} —{" "}
            <Link href="/auth" className="underline hover:text-foreground">
              {t("header.sign_in")}
            </Link>
            {t("home.to_save_track")}
          </p>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Default state — input form
  // ---------------------------------------------------------------------
  return (
    <div className="w-full space-y-3 animate-fade-in">
      {signedIn && (
        <button
          type="button"
          onClick={() => setBulkMode((b) => !b)}
          className={`flex items-center gap-1.5 text-[11px] border border-border bg-card px-3 py-1.5 transition-colors hover:bg-accent btn-press touch-target ${bulkMode ? "text-foreground" : "text-muted-foreground"}`}
        >
          <Layers className="h-3 w-3" />
          {bulkMode ? t("home.shorten_tab") : t("home.bulk_toggle")}
        </button>
      )}
      {bulkMode && signedIn ? (
        <BulkForm />
      ) : (
      <form onSubmit={handleSubmit} className="w-full space-y-2">
        <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors input-focus-glow">
          <span className="pl-4 pr-2 text-muted-foreground select-none text-sm flex items-center">
            &gt;
          </span>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t("home.paste_url")}
              className="w-full bg-transparent border-0 outline-none py-3 text-sm placeholder:text-muted-foreground/60"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
            />
            {/* URL validation indicator */}
            {urlValidation && focused && (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 validation-indicator validation-indicator-enter ${urlValidation === "valid" ? "text-[#2c6e49]" : "text-destructive"}`}>
                {urlValidation === "valid" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>
          {!url && !busy && (
            <button
              type="button"
              onClick={handlePaste}
              className="border-l border-border text-muted-foreground hover:text-foreground hover:bg-accent px-3 text-sm transition-colors touch-target btn-press"
              title={t("home.paste_from_clipboard")}
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="border-l border-border bg-card text-foreground hover:bg-accent px-5 sm:px-6 text-sm transition-colors disabled:opacity-50 btn-press btn-ripple touch-target"
            disabled={busy || !url}
          >
            {busy ? "..." : t("home.shorten_btn")}
          </button>
        </div>

        {/* Destination URL preview */}
        {urlPreview && (
          <div className="px-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{urlPreview.domain}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="tabular-nums">
              {t("home.chars_count").replace("{n}", String(urlPreview.length))}
            </span>
            {urlPreview.hasUtm && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-0.5">
                  <Tag className="h-2.5 w-2.5" />
                  {t("home.utm_appended")}
                </span>
              </>
            )}
          </div>
        )}

        {/* URL Metadata Preview Card */}
        {previewLoading && urlValidation === "valid" && (
          <div className="border border-border bg-card rounded-md p-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-4 w-4 rounded-sm shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="skeleton-shimmer h-3 w-3/4 rounded-sm" />
                <div className="skeleton-shimmer h-2.5 w-1/2 rounded-sm" />
              </div>
            </div>
            <div className="mt-2 skeleton-shimmer h-2.5 w-full rounded-sm" />
          </div>
        )}
        {!previewLoading && previewData && urlValidation === "valid" && (
          <div className="border border-border bg-card rounded-md p-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              {/* Favicon */}
              <div className="shrink-0 mt-0.5">
                {previewData.favicon ? (
                  <img
                    src={previewData.favicon}
                    alt=""
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded-sm object-contain"
                    onError={(e) => {
                      // Replace with Globe icon on error
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    }}
                  />
                ) : null}
                <Globe
                  className="h-4 w-4 text-muted-foreground"
                  style={{ display: previewData.favicon ? "none" : "block" }}
                />
              </div>
              {/* Title & domain */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">
                  {previewData.title || previewData.domain}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {previewData.domain}
                </p>
                {previewData.description && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                    {previewData.description.length > 120
                      ? previewData.description.slice(0, 120) + "..."
                      : previewData.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {!previewLoading && previewError && urlValidation === "valid" && (
          <div className="border border-border bg-card rounded-md p-3 animate-fade-in">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span>{t("shortener.preview_no_data")}</span>
            </div>
          </div>
        )}

        {/* Character count for long URLs + keyboard shortcut hint */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground/60">
            {url.length > 60 ? (
              <span className="tabular-nums">
                {t("home.chars_count").replace("{n}", String(url.length))}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <kbd className="border border-border px-1 text-[9px]">/</kbd>
                <span className="text-[9px]">{t("home.or")}</span>
                <kbd className="border border-border px-1 text-[9px]">Ctrl+K</kbd>
                <span className="text-[9px]">{t("home.to_focus")}</span>
              </span>
            )}
          </span>
          {url.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              <kbd className="border border-border px-1 text-[9px]">Esc</kbd>
              <span className="text-[9px] ml-0.5">{t("home.to_clear")}</span>
            </span>
          )}
        </div>

        {/* Advanced options toggle */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 touch-target"
          >
            {advancedOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {t("home.advanced_options")}
            {!signedIn && <Lock className="h-3 w-3" />}
          </button>
        </div>

        {advancedOpen && (
          <div className="space-y-2 animate-fade-in">
            {signedIn ? (
              <>
                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors input-focus-glow">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                    /
                  </span>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.toLowerCase())}
                    placeholder={t("home.custom_alias")}
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
                      className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors touch-target"
                    >
                      {t("common.clear")}
                    </button>
                  )}
                </div>
                {alias && slugChecking && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("shortener.slug_checking")}
                  </div>
                )}
                {alias && !slugChecking && slugAvailable === true && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 mt-1">
                    <Check className="h-3 w-3" />
                    {t("shortener.slug_available")}
                  </div>
                )}
                {alias && !slugChecking && slugAvailable === false && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                    <X className="h-3 w-3" />
                    {t("shortener.slug_taken")}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-stretch border border-border bg-background">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                  /
                </span>
                <input
                  type="text"
                  placeholder={t("home.custom_alias_locked")}
                  className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/40 text-muted-foreground/60"
                  disabled
                  readOnly
                />
                <Lock className="h-3 w-3 text-muted-foreground/50 mr-3" />
              </div>
            )}

            {/* Pincode input */}
            <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors input-focus-glow">
              <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                <KeyRound className="h-3 w-3" />
              </span>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder={t("home.pincode")}
                className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
                disabled={busy}
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
              />
              {pincode && (
                <button
                  type="button"
                  onClick={() => setPincode("")}
                  className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors touch-target"
                >
                  {t("common.clear")}
                </button>
              )}
            </div>

            {/* UTM Parameters Builder */}
            <div className="border border-border bg-background">
              <button
                type="button"
                onClick={() => setUtmOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors touch-target"
              >
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  {t("home.utm_params")}
                  {hasAnyUtm(utm) && (
                    <span className="text-[9px] bg-accent px-1 py-px border border-border">
                      {t("home.utm_active")}
                    </span>
                  )}
                </span>
                {utmOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {utmOpen && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(["source", "medium", "campaign", "term", "content"] as const).map((key) => (
                      <input
                        key={key}
                        type="text"
                        value={utm[key]}
                        onChange={(e) => setUtm((u) => ({ ...u, [key]: e.target.value }))}
                        placeholder={key}
                        className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50 input-focus-glow"
                        disabled={busy}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    ))}
                  </div>
                  {/* UTM URL preview */}
                  {fullUrlWithUtm && (
                    <p className="text-[10px] text-muted-foreground truncate font-mono">
                      {fullUrlWithUtm}
                    </p>
                  )}
                  {hasAnyUtm(utm) && (
                    <button
                      type="button"
                      onClick={() =>
                        setUtm({ source: "", medium: "", campaign: "", term: "", content: "" })
                      }
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors touch-target"
                    >
                      {t("home.clear_utm")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Link Expiration */}
            <div className="border border-border bg-background">
              <button
                type="button"
                onClick={() => setExpiryOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors touch-target"
              >
                <span className="flex items-center gap-1.5">
                  <Timer className="h-3 w-3" />
                  {t("home.expires")}
                  {expiryOption.seconds !== null && (
                    <span className="text-[9px] bg-accent px-1 py-px border border-border">
                      {t(expiryOption.key)}
                    </span>
                  )}
                </span>
                {expiryOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {expiryOpen && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  <select
                    value={expiryIndex}
                    onChange={(e) => setExpiryIndex(Number(e.target.value))}
                    className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none input-focus-glow appearance-none"
                    disabled={busy}
                  >
                    {EXPIRY_OPTIONS.map((opt, i) => (
                      <option key={i} value={i}>
                        {t(opt.key)}
                      </option>
                    ))}
                  </select>
                  {expiryOption.seconds !== null && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatExpiryDate(expiryOption.seconds)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Max uses */}
            <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors input-focus-glow">
              <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                <Timer className="h-3 w-3" />
              </span>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t("expiry.max_uses")}
                className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
                disabled={busy}
                autoComplete="off"
              />
              {maxUses && (
                <button
                  type="button"
                  onClick={() => setMaxUses("")}
                  className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors touch-target"
                >
                  {t("common.clear")}
                </button>
              )}
            </div>

            {/* OG meta / social preview */}
            <div className="border border-border bg-background">
              <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                {t("og.section")}
              </div>
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  placeholder={t("og.og_title_placeholder")}
                  className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50 input-focus-glow"
                  disabled={busy}
                />
                <input
                  type="text"
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  placeholder={t("og.og_description_placeholder")}
                  className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50 input-focus-glow"
                  disabled={busy}
                />
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder={t("og.og_image_placeholder")}
                  className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50 input-focus-glow"
                  disabled={busy}
                />
              </div>
            </div>

            {!signedIn && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <Link href="/auth" className="underline hover:text-foreground">
                  {t("header.sign_in")}
                </Link>
                {t("home.sign_in_for_alias_suffix")}
              </p>
            )}
          </div>
        )}
      </form>
      )}

      {error && (
        <div className={`border border-destructive/20 bg-destructive/5 px-4 py-2.5 ${errorShake ? "animate-error-shake" : ""}`}>
          <p className="text-xs text-destructive leading-relaxed text-center">
            ! {error}
          </p>
        </div>
      )}
    </div>
  );
}
