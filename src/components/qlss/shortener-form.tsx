"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Lock,
  QrCode,
  X,
  Clock,
  Ban,
  ClipboardPaste,
  Download,
  Share2,
  KeyRound,
  Timer,
  Tag,
  FileText,
  Code,
  Braces,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";

interface CreatedLink {
  slug: string;
  short_url: string;
  destination_url: string;
  owner: boolean;
}

interface RecentLink {
  slug: string;
  short_url: string;
  destination_url: string;
  created_at: string;
}

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

const EXPIRY_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: "never", seconds: null },
  { label: "1 hour", seconds: 3600 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "30 days", seconds: 2592000 },
  { label: "90 days", seconds: 7776000 },
];

const MAX_RECENT = 5;
const RECENT_KEY = "qlss:recent_links";
const COUNTER_KEY = "qlss:total_shortened";

function getRecentLinks(): RecentLink[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as RecentLink[];
  } catch {
    return [];
  }
}

function saveRecentLink(link: RecentLink) {
  try {
    const existing = getRecentLinks();
    const filtered = existing.filter((l) => l.slug !== link.slug);
    filtered.unshift(link);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

function getTotalShortened(): number {
  try {
    return parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

function incrementTotalShortened() {
  try {
    const current = getTotalShortened();
    localStorage.setItem(COUNTER_KEY, String(current + 1));
  } catch {
    // ignore
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getLinkAge(iso: string): "new" | "today" | "old" {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return "new";
  if (diff < 86400000) return "today";
  return "old";
}

function truncateUrl(url: string, max: number = 45): string {
  if (url.length <= max) return url;
  return url.slice(0, max - 3) + "...";
}

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
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return `expires ${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
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
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([]);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [typedUrl, setTypedUrl] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [totalShortened, setTotalShortened] = useState(0);
  const [counterBump, setCounterBump] = useState(false);
  const [pincode, setPincode] = useState("");
  const [utmOpen, setUtmOpen] = useState(false);
  const [utm, setUtm] = useState<UTMParams>({ source: "", medium: "", campaign: "", term: "", content: "" });
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiryIndex, setExpiryIndex] = useState(0); // index into EXPIRY_OPTIONS, default "never"
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // Web Share API support
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  // Loading skeleton — show for 300ms on mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Load total shortened count on mount
  useEffect(() => {
    setTotalShortened(getTotalShortened());
  }, []);

  // URL validation state
  const urlValidation = useMemo(() => {
    if (url.length < 3) return null;
    return looksLikeUrl(url) ? "valid" : "invalid";
  }, [url]);

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
      setCounterBump(true);
      const t = setTimeout(() => setShowConfetti(false), 800);
      const t2 = setTimeout(() => setCounterBump(false), 300);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
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

  const refreshRecent = useCallback(() => {
    setRecentLinks(getRecentLinks());
  }, []);

  useEffect(() => {
    refreshRecent();
    const handler = () => refreshRecent();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshRecent]);

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
        title: "clipboard error",
        description: "could not read clipboard — check permissions",
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

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not create the link.");
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

      saveRecentLink({
        slug: linkData.slug,
        short_url: linkData.short_url,
        destination_url: linkData.destination_url,
        created_at: new Date().toISOString(),
      });
      refreshRecent();

      // Increment counter
      incrementTotalShortened();
      setTotalShortened(getTotalShortened());

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
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "copied",
        description: label,
        duration: 2000,
      });
      setCopyMenuOpen(false);
    }).catch(() => {
      // ignore
    });
  }

  function handleCopyToast(shortUrl: string) {
    handleCopyText(shortUrl, "link copied to clipboard");
  }

  async function handleShare(shortUrl: string) {
    try {
      await navigator.share({
        title: "Short link",
        url: shortUrl,
      });
    } catch {
      // user cancelled or share failed
    }
  }

  function downloadQR(shortUrl: string) {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
      }
      ctx?.drawImage(img, 0, 0, size, size);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qr-${shortUrl.split("/").pop() ?? "link"}.png`;
      a.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  function handleReset() {
    setCreated(null);
    setError(null);
    setCopied(false);
    setShowQR(false);
    setTypedUrl("");
    setShowConfetti(false);
    setShowCheckmark(false);
    setPincode("");
    setUtm({ source: "", medium: "", campaign: "", term: "", content: "" });
    setExpiryIndex(0);
    setUtmOpen(false);
    setExpiryOpen(false);
    setCopyMenuOpen(false);
  }

  function clearRecent() {
    localStorage.removeItem(RECENT_KEY);
    setRecentLinks([]);
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
              result
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              + new
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
                  saved {charsSaved} chars ({percentShorter}% shorter)
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowQR((q) => !q)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 border border-border bg-background hover:bg-accent touch-target"
                title="Show QR code"
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
                    <Copy className="h-3 w-3" /> copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyMenuOpen((o) => !o)}
                    className="text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1.5 border border-l-0 border-border bg-background hover:bg-accent touch-target rounded-none rounded-r-sm"
                    title="Copy format options"
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
                        handleCopyText(created.short_url, "url copied to clipboard")
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      copy url
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `[${destTitle}](${created.short_url})`,
                          "markdown copied to clipboard"
                        )
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      copy markdown
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `<a href="${created.short_url}">${destTitle}</a>`,
                          "html copied to clipboard"
                        )
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Code className="h-3 w-3 shrink-0" />
                      copy html
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
                          "json copied to clipboard"
                        )
                      }
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Braces className="h-3 w-3 shrink-0" />
                      copy json
                    </button>
                  </div>
                )}
              </div>
              {canShare && (
                <button
                  type="button"
                  onClick={() => handleShare(created.short_url)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 border border-border bg-background hover:bg-accent touch-target"
                  title="Share"
                >
                  <Share2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QR Code overlay */}
        {showQR && (
          <div className="border border-border bg-card p-4 flex flex-col items-center gap-3">
            <div ref={qrRef} className="p-3 bg-white border border-border">
              <QRCodeSVG
                value={created.short_url}
                size={120}
                level="M"
                bgColor="#ffffff"
                fgColor="#0c0c0a"
              />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              scan to visit
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadQR(created.short_url)}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs touch-target btn-press"
              >
                <Download className="h-3 w-3" /> download png
              </button>
              <button
                type="button"
                onClick={() => setShowQR(false)}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs touch-target"
              >
                <X className="h-3 w-3" /> hide
              </button>
            </div>
          </div>
        )}

        {!created.owner && (
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            unclaimed —{" "}
            <Link href="/auth" className="underline hover:text-foreground">
              sign in
            </Link>{" "}
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
    <div className="w-full space-y-3 animate-fade-in">
      {/* Links shortened counter */}
      {totalShortened > 0 && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <span>
            <span className={`text-foreground font-medium tabular-nums ${counterBump ? "animate-counter-bump" : ""}`}>
              {totalShortened}
            </span>{" "}
            link{totalShortened !== 1 ? "s" : ""} shortened
          </span>
        </div>
      )}

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
              placeholder="paste a long url"
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
            {busy ? "..." : "shorten"}
          </button>
        </div>

        {/* Destination URL preview */}
        {urlPreview && (
          <div className="px-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{urlPreview.domain}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="tabular-nums">{urlPreview.length} chars</span>
            {urlPreview.hasUtm && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-0.5">
                  <Tag className="h-2.5 w-2.5" />
                  utm params appended
                </span>
              </>
            )}
          </div>
        )}

        {/* Character count for long URLs + keyboard shortcut hint */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground/60">
            {url.length > 60 ? (
              <span className="tabular-nums">{url.length} chars</span>
            ) : (
              <span className="flex items-center gap-1">
                <kbd className="border border-border px-1 text-[9px]">/</kbd>
                <span className="text-[9px]">or</span>
                <kbd className="border border-border px-1 text-[9px]">Ctrl+K</kbd>
                <span className="text-[9px]">to focus</span>
              </span>
            )}
          </span>
          {url.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              <kbd className="border border-border px-1 text-[9px]">Esc</kbd>
              <span className="text-[9px] ml-0.5">to clear</span>
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
            advanced options
            {!signedIn && <Lock className="h-3 w-3" />}
          </button>
        </div>

        {advancedOpen && (
          <div className="space-y-2 animate-fade-in">
            {signedIn ? (
              <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors input-focus-glow">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
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
                    className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors touch-target"
                  >
                    clear
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-stretch border border-border bg-background">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                  /
                </span>
                <input
                  type="text"
                  placeholder="custom alias"
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
                placeholder="pincode (optional — visitors must enter it to access)"
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
                  clear
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
                  utm params
                  {hasAnyUtm(utm) && (
                    <span className="text-[9px] bg-accent px-1 py-px border border-border">
                      active
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
                      clear all utm
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
                  expires
                  {expiryOption.seconds !== null && (
                    <span className="text-[9px] bg-accent px-1 py-px border border-border">
                      {expiryOption.label}
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
                        {opt.label}
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

            {!signedIn && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <Link href="/auth" className="underline hover:text-foreground">
                  sign in
                </Link>{" "}
                to use custom aliases and manage your links.
              </p>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className={`border border-destructive/20 bg-destructive/5 px-4 py-2.5 ${errorShake ? "animate-error-shake" : ""}`}>
          <p className="text-xs text-destructive leading-relaxed text-center">
            ! {error}
          </p>
        </div>
      )}

      {/* Recent links history */}
      {recentLinks.length > 0 && !created && (
        <div className="border border-border bg-card">
          <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>recent</span>
            </div>
            <button
              type="button"
              onClick={clearRecent}
              className="text-muted-foreground hover:text-foreground transition-colors text-[10px] touch-target"
            >
              clear
            </button>
          </div>
          <ul>
            {recentLinks.map((link, i) => (
              <li key={link.slug}>
                <div className="px-4 py-2.5 flex items-center justify-between gap-3 group">
                  <div className="min-w-0 flex-1">
                    <a
                      href={link.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline block truncate"
                    >
                      /{link.slug}
                    </a>
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                      -&gt; {truncateUrl(link.destination_url)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AgeBadge iso={link.created_at} />
                    <button
                      type="button"
                      onClick={() => handleCopyToast(link.short_url)}
                      className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 touch-target"
                      title="Copy"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {i < recentLinks.length - 1 && <hr className="hr-dashed border-0" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AgeBadge({ iso }: { iso: string }) {
  const age = getLinkAge(iso);

  if (age === "new") {
    return (
      <span className="badge-new text-[9px] uppercase tracking-widest border px-1 py-px leading-none">
        new
      </span>
    );
  }

  if (age === "today") {
    return (
      <span className="badge-today text-[9px] uppercase tracking-widest border px-1 py-px leading-none">
        today
      </span>
    );
  }

  return (
    <span className="text-[10px] text-muted-foreground">
      {formatRelativeTime(iso)}
    </span>
  );
}
