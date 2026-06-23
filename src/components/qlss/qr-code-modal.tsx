"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  Copy,
  Check,
  RotateCcw,
  Upload,
  X,
  Link2,
  ImageDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

type EccLevel = "L" | "M" | "Q" | "H";
type DownloadFormat = "svg" | "png";
type SizeOption = 128 | 256 | 512 | 1024;

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

const DEFAULT_FG = "#0a0a09";
const DEFAULT_BG = "#ffffff";
const DEFAULT_ECC: EccLevel = "M";
const DEFAULT_SIZE: SizeOption = 256;
const DEFAULT_FORMAT: DownloadFormat = "png";

const SIZE_OPTIONS: SizeOption[] = [128, 256, 512, 1024];
const ECC_OPTIONS: { value: EccLevel; key: string }[] = [
  { value: "L", key: "qr_modal.ecc_l" },
  { value: "M", key: "qr_modal.ecc_m" },
  { value: "Q", key: "qr_modal.ecc_q" },
  { value: "H", key: "qr_modal.ecc_h" },
];

function isHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Extract a slug-like filename from a URL. */
function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || u.hostname.replace(/\./g, "-") || "link";
  } catch {
    return url.split("/").pop() || "link";
  }
}

/**
 * Serialize the live QRCodeSVG node to an SVG string.
 * Optionally override width/height so PNG export uses the requested
 * pixel size rather than the on-screen preview size (kept small for layout).
 */
function serializeQrSvg(
  container: HTMLElement | null,
  targetSize?: number,
): string | null {
  if (!container) return null;
  const svgEl = container.querySelector("svg");
  if (!svgEl) return null;
  const clone = svgEl.cloneNode(true) as SVGElement;
  // Ensure xmlns is present so the file is portable
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (targetSize && targetSize > 0) {
    clone.setAttribute("width", String(targetSize));
    clone.setAttribute("height", String(targetSize));
  }
  return new XMLSerializer().serializeToString(clone);
}

/** Convert an SVG string into a PNG data URL via canvas. */
async function svgToPngDataUrl(
  svgString: string,
  size: number,
  bgColor: string,
): Promise<string> {
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function QrCodeModal({ open, onOpenChange, url }: QrCodeModalProps) {
  // ─── Customization state ────────────────────────────────────────────────
  const [fgColor, setFgColor] = useState(DEFAULT_FG);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);
  const [ecc, setEcc] = useState<EccLevel>(DEFAULT_ECC);
  const [size, setSize] = useState<SizeOption>(DEFAULT_SIZE);
  const [format, setFormat] = useState<DownloadFormat>(DEFAULT_FORMAT);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset to defaults whenever the modal opens (so each session starts clean).
  useEffect(() => {
    if (open) {
      setFgColor(DEFAULT_FG);
      setBgColor(DEFAULT_BG);
      setEcc(DEFAULT_ECC);
      setSize(DEFAULT_SIZE);
      setFormat(DEFAULT_FORMAT);
      setLogo(null);
      setBusy(false);
      setCopied(false);
    }
  }, [open]);

  const handleReset = useCallback(() => {
    setFgColor(DEFAULT_FG);
    setBgColor(DEFAULT_BG);
    setEcc(DEFAULT_ECC);
    setSize(DEFAULT_SIZE);
    setFormat(DEFAULT_FORMAT);
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const showLogoWarning = logo !== null && (ecc === "L" || ecc === "M");

  // ─── Logo upload ────────────────────────────────────────────────────────
  const handleLogoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "logo must be an image", variant: "destructive" });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "logo too large (max 2MB)", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setLogo(reader.result);
          // Auto-bump ECC to Q if currently L or M so the warning clears.
          setEcc((cur) => (cur === "L" || cur === "M" ? "Q" : cur));
        }
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleRemoveLogo = useCallback(() => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ─── Copy URL ───────────────────────────────────────────────────────────
  const [urlCopied, setUrlCopied] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (!urlCopied) return;
    const id = setTimeout(() => setUrlCopied(false), 1500);
    return () => clearTimeout(id);
  }, [urlCopied, open]);

  const handleCopyUrl = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
    } catch {
      toast({ title: "clipboard unavailable", variant: "destructive" });
    }
  }, [url]);

  // ─── Download ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!url) return;
    // For PNG, set the SVG width/height to the export size so the raster
    // is the requested resolution (no upscaling). For SVG, set it too so
    // the file renders at the user's chosen pixel dimensions by default.
    const svgString = serializeQrSvg(previewRef.current, size);
    if (!svgString) {
      toast({ title: "qr not ready", variant: "destructive" });
      return;
    }
    setBusy(true);
    const slug = slugFromUrl(url);
    try {
      if (format === "svg") {
        const blob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });
        const href = URL.createObjectURL(blob);
        triggerDownload(href, `qr-${slug}.svg`);
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      } else {
        const pngDataUrl = await svgToPngDataUrl(svgString, size, bgColor);
        triggerDownload(pngDataUrl, `qr-${slug}.png`);
      }
    } catch {
      toast({ title: "download failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [url, format, size, bgColor]);

  // ─── Copy as data URL ───────────────────────────────────────────────────
  const handleCopyDataUrl = useCallback(async () => {
    if (!url) return;
    const svgString = serializeQrSvg(previewRef.current, size);
    if (!svgString) {
      toast({ title: "qr not ready", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const pngDataUrl = await svgToPngDataUrl(svgString, size, bgColor);
      await navigator.clipboard.writeText(pngDataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "copy failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [url, size, bgColor]);

  // ─── Truncated URL preview ──────────────────────────────────────────────
  const displayUrl =
    url.length > 56 ? `${url.slice(0, 27)}…${url.slice(-25)}` : url;

  // Visual sizing for the on-screen preview (cap so it fits in the column).
  const previewDisplaySize = Math.min(size, 320);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-y-auto max-h-[calc(100dvh-2rem)] custom-scroll">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-mono text-base flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400">▸</span>
            {t("qr_modal.title")}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {t("qr_modal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr]">
          {/* ─── Left: QR preview (sticky on desktop) ─────────────────── */}
          <div className="md:sticky md:top-0 flex flex-col items-center justify-start gap-3 p-5 bg-muted/30 md:border-r border-b md:border-b-0 border-border">
            {/* URL being encoded */}
            <div className="w-full space-y-1.5">
              <Label
                htmlFor="qr-encoded-url"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                {t("qr_modal.url_label")}
              </Label>
              <div className="flex items-center gap-1.5">
                <code
                  id="qr-encoded-url"
                  className="flex-1 min-w-0 truncate font-mono text-xs text-foreground bg-background border border-border px-2 py-1.5"
                  title={url}
                >
                  {displayUrl || "—"}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopyUrl}
                  disabled={!url}
                  title={t("qr_modal.copy_data_url")}
                >
                  {urlCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* The QR itself — always on a white background for scannability */}
            <div className="bg-white p-4 rounded-lg border border-border shadow-sm">
              <div
                ref={previewRef}
                className="relative"
                style={{ width: previewDisplaySize, height: previewDisplaySize }}
              >
                <QRCodeSVG
                  value={url || "https://qlss.app"}
                  size={previewDisplaySize}
                  level={ecc}
                  bgColor={bgColor}
                  fgColor={isHex(fgColor) ? fgColor : DEFAULT_FG}
                  marginSize={0}
                />
                {logo && (
                  // White pad behind the logo so modules around it stay readable.
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="bg-white p-1.5 rounded-sm shadow-sm"
                      style={{
                        width: previewDisplaySize * 0.22,
                        height: previewDisplaySize * 0.22,
                      }}
                    >
                      {/* logo is a user-uploaded data URL — next/image is unnecessary here */}
                      <img
                        src={logo}
                        alt="qr logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {size} × {size}px · {format.toUpperCase()}
            </p>

            {showLogoWarning && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-snug text-center font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-1.5 rounded">
                ⚠ {t("qr_modal.logo_warning")}
              </p>
            )}
          </div>

          {/* ─── Right: controls (scrollable on desktop) ─────────────────── */}
          <div className="p-5 space-y-5 md:max-h-[65vh] md:overflow-y-auto custom-scroll">
            {/* Foreground color */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("qr_modal.foreground")}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isHex(fgColor) ? fgColor : DEFAULT_FG}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-9 w-12 shrink-0 rounded-sm border border-border bg-background cursor-pointer p-0.5"
                  aria-label={t("qr_modal.foreground")}
                />
                <Input
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="font-mono text-xs h-9"
                  maxLength={7}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Background color */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("qr_modal.background")}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isHex(bgColor) ? bgColor : DEFAULT_BG}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-9 w-12 shrink-0 rounded-sm border border-border bg-background cursor-pointer p-0.5"
                  aria-label={t("qr_modal.background")}
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="font-mono text-xs h-9"
                  maxLength={7}
                  spellCheck={false}
                />
              </div>
            </div>

            <Separator />

            {/* Error correction */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("qr_modal.error_correction")}
              </Label>
              <ToggleGroup
                type="single"
                value={ecc}
                onValueChange={(v) => v && setEcc(v as EccLevel)}
                variant="outline"
                className="w-full grid grid-cols-4 gap-0"
              >
                {ECC_OPTIONS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    className="font-mono text-xs h-9"
                  >
                    {t(opt.key)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Size selector */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("qr_modal.size")}
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={size === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSize(s)}
                    className="font-mono text-xs h-9"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Format selector */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("qr_modal.format")}
              </Label>
              <ToggleGroup
                type="single"
                value={format}
                onValueChange={(v) => v && setFormat(v as DownloadFormat)}
                variant="outline"
                className="w-full grid grid-cols-2 gap-0"
              >
                <ToggleGroupItem
                  value="svg"
                  className="font-mono text-xs h-9"
                >
                  {t("qr_modal.svg")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="png"
                  className="font-mono text-xs h-9"
                >
                  {t("qr_modal.png")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Separator />

            {/* Logo upload */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("qr_modal.logo_upload")}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                  id="qr-logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-xs h-9"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logo ? "change" : t("qr_modal.logo_upload")}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="font-mono text-xs h-9 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("qr_modal.logo_remove")}
                  </Button>
                )}
              </div>
              {logo && (
                <div className="flex items-center gap-2 mt-1.5">
                  {/* logo is a user-uploaded data URL — next/image is unnecessary here */}
                  <img
                    src={logo}
                    alt="logo preview"
                    className="h-8 w-8 object-contain bg-white border border-border rounded-sm p-0.5"
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ✓ logo loaded · ecc auto-set to Q
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Action row: copy data URL + reset */}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyDataUrl}
                disabled={busy || !url}
                className="font-mono text-xs h-9 w-full btn-press"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {t("common.copied")}
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    {t("qr_modal.copy_data_url")}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="font-mono text-xs h-9 w-full text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("qr_modal.reset")}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Footer: download button ──────────────────────────────── */}
        <div className="border-t border-border bg-muted/30 px-5 py-3">
          <Button
            type="button"
            onClick={handleDownload}
            disabled={busy || !url}
            className="w-full font-mono text-sm h-10 btn-press"
          >
            {busy ? (
              <>
                <ImageDown className="h-4 w-4 animate-pulse" />
                …
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("qr_modal.download")} · {format.toUpperCase()}
                {format === "png" ? ` · ${size}px` : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
