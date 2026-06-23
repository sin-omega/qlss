"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Check,
  Copy,
  ChevronDown,
  Loader2,
  Link,
  ClipboardPaste,
  Upload,
  FileText,
  FileJson,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

interface BulkResult {
  destination_url: string;
  slug: string;
  short_url: string;
  status: "idle" | "loading" | "success" | "error";
  error?: string;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
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
  const withProto =
    str.startsWith("http://") || str.startsWith("https://")
      ? str
      : `https://${str}`;
  return isValidUrl(withProto);
}

function parseUrls(input: string): string[] {
  // Split by newlines, commas, or whitespace — then validate each token
  const tokens = input
    .split(/[\n,]+/)
    .flatMap((line) => line.trim().split(/\s+/))
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  }

  // Only keep tokens that look like URLs
  return unique.filter(looksLikeUrl);
}

// ─── File parsing helpers ────────────────────────────────────────────────

function parseTxt(content: string): string[] {
  return content
    .split(/[\r\n]+/)
    .flatMap((line) => line.trim().split(/[\s,]+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Minimal RFC-4180-ish CSV parser that supports quoted fields with embedded
 * commas, double-quote escaping, and either comma or semicolon separators. */
function parseCsvRow(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(content: string): string[] {
  const text = content.replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  // Detect delimiter (comma vs semicolon) by counting occurrences in the first line
  const firstLine = text.split("\n")[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semiCount = (firstLine.match(/;/g) ?? []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";
  const rows = text.split("\n").map((line) => parseCsvRow(line, delimiter));
  if (rows.length === 0) return [];

  // Look for a column header named url/URL/link/href/destination
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const urlHeaderIdx = header.findIndex((h) =>
    ["url", "link", "href", "destination", "destination_url"].includes(h)
  );

  let urlColIdx = -1;
  if (urlHeaderIdx >= 0) {
    urlColIdx = urlHeaderIdx;
    // Skip header row
    rows.shift();
  } else {
    // Find the first column where row sample looks URL-like
    for (let c = 0; c < (rows[0]?.length ?? 0); c++) {
      const sample = rows.slice(0, 5).map((r) => r[c] ?? "");
      if (sample.some((s) => looksLikeUrl(s))) {
        urlColIdx = c;
        break;
      }
    }
    if (urlColIdx < 0) urlColIdx = 0; // default to first column
  }

  return rows
    .map((r) => (r[urlColIdx] ?? "").trim())
    .filter((s) => s.length > 0);
}

function findUrlInObject(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const key of ["url", "link", "destination", "href", "destination_url"]) {
    const v = rec[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function parseJson(content: string): string[] {
  const data = JSON.parse(content);
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "object" && item !== null) return findUrlInObject(item);
        return null;
      })
      .filter((s): s is string => !!s && s.length > 0);
  }
  // Object with `urls` array
  if (data && typeof data === "object") {
    const maybeUrls = (data as Record<string, unknown>).urls;
    if (Array.isArray(maybeUrls)) {
      return maybeUrls
        .map((item) =>
          typeof item === "string" ? item.trim() : findUrlInObject(item)
        )
        .filter((s): s is string => !!s && typeof s === "string" && s.length > 0);
    }
    // Single object with url field
    const single = findUrlInObject(data);
    if (single) return [single];
  }
  return [];
}

async function parseFile(file: File): Promise<string[]> {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".json")) return parseJson(text);
  if (lower.endsWith(".csv")) return parseCsv(text);
  // .txt or anything else — treat as plain text
  return parseTxt(text);
}

export function BulkForm() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validUrls = useMemo(() => parseUrls(input), [input]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      const allUrls: string[] = [];
      for (const file of arr) {
        try {
          const urls = await parseFile(file);
          allUrls.push(...urls);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toast({
            title: "import failed",
            description: t("bulk.import_error").replace("{{message}}", msg),
            duration: 4000,
          });
        }
      }
      if (allUrls.length === 0) return;
      // Append to existing input, dedupe + filter via parseUrls
      const combined = (input.trim() ? input.trim() + "\n" : "") + allUrls.join("\n");
      const deduped = parseUrls(combined);
      setInput(deduped.join("\n"));
      toast({
        title: "imported",
        description: t("bulk.imported").replace("{{count}}", String(deduped.length)),
        duration: 2500,
      });
    },
    [input]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (busy) return;
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) void handleFiles(files);
    },
    [busy, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) void handleFiles(files);
      // Reset so selecting the same file again re-triggers
      e.target.value = "";
    },
    [handleFiles]
  );

  // Close copy menu on outside click
  useEffect(() => {
    if (!copyMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        copyMenuRef.current &&
        !copyMenuRef.current.contains(e.target as Node)
      ) {
        setCopyMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [copyMenuOpen]);

  const successfulResults = useMemo(
    () => results.filter((r) => r.status === "success"),
    [results]
  );

  function handleCopyText(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "copied",
          description: label,
          duration: 2000,
        });
        setCopyMenuOpen(false);
      })
      .catch(() => {
        // ignore
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || validUrls.length === 0) return;

    setBusy(true);
    setResults(
      validUrls.map((url) => ({
        destination_url: url,
        slug: "",
        short_url: "",
        status: "idle" as const,
      }))
    );

    // Fire all requests in parallel using Promise.allSettled
    const promises = validUrls.map(async (url, i) => {
      setResults((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "loading" };
        return next;
      });

      try {
        const normalized = normalizeUrl(url);
        const res = await fetch("/api/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination_url: normalized }),
        });
        const json = await res.json();

        if (!res.ok) {
          const errorMsg = json?.error ?? "Failed to shorten";
          setResults((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: "error", error: errorMsg };
            return next;
          });
          return;
        }

        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "success",
            slug: json.slug,
            short_url: json.short_url,
          };
          return next;
        });

        // Dispatch a localStorage-history event so LocalHistory can pick it up
        if (typeof window !== "undefined" && json.slug && json.short_url) {
          try {
            window.dispatchEvent(
              new CustomEvent("qlss:local-history-add", {
                detail: {
                  slug: json.slug,
                  short_url: json.short_url,
                  destination_url: normalized,
                  created_at: Date.now(),
                },
              })
            );
          } catch {
            // ignore dispatch errors
          }
        }
      } catch {
        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "error",
            error: "Network error",
          };
          return next;
        });
      }
    });

    await Promise.allSettled(promises);
    setBusy(false);
  }

  function handleCopyAllUrls() {
    if (successfulResults.length === 0) return;
    const text = successfulResults.map((r) => r.short_url).join("\n");
    handleCopyText(text, `${successfulResults.length} url(s) copied to clipboard`);
  }

  function handleCopyAsCsv() {
    if (successfulResults.length === 0) return;
    const lines = successfulResults.map(
      (r) => `${r.slug},${r.short_url},${r.destination_url}`
    );
    handleCopyText(
      lines.join("\n"),
      `${successfulResults.length} result(s) copied as csv`
    );
  }

  function handleCopyAsJson() {
    if (successfulResults.length === 0) return;
    const data = successfulResults.map((r) => ({
      slug: r.slug,
      short_url: r.short_url,
      destination_url: r.destination_url,
    }));
    handleCopyText(
      JSON.stringify(data, null, 2),
      `${successfulResults.length} result(s) copied as json`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      {/* Drag-and-drop zone */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="bulk-file-input"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`group flex-1 flex items-center gap-2.5 border border-dashed border-border bg-card/40 px-3 py-2.5 text-xs cursor-pointer transition-colors outline-none focus-visible:border-foreground hover:border-foreground/70 ${
            isDragging ? "border-foreground bg-accent/20" : ""
          }`}
        >
          {isDragging ? (
            <Upload className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors min-w-0">
            {isDragging ? (
              <span className="text-foreground font-medium truncate">{t("bulk.drop_zone_active")}</span>
            ) : (
              <>
                <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                <FileJson className="h-3 w-3 shrink-0" aria-hidden="true" />
                <FileSpreadsheet className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{t("bulk.drop_zone")}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 hidden sm:inline">
                  · {t("bulk.files_supported")}
                </span>
              </>
            )}
          </span>
          <input
            id="bulk-file-input"
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt,text/csv,application/json,text/plain"
            multiple
            onChange={handleFileInputChange}
            className="sr-only"
            disabled={busy}
          />
        </label>
        {input.trim().length > 0 && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              setResults([]);
            }}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-1 border border-border bg-background px-2.5 py-2.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 touch-target"
            title={t("bulk.clear_all")}
          >
            <X className="h-3 w-3" />
            <span className="hidden sm:inline">{t("bulk.clear_all")}</span>
          </button>
        )}
      </div>

      <div className="flex items-stretch">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"paste multiple urls — one per line, comma, or space separated"}
          className="w-full border border-border bg-card px-3 py-2.5 text-xs placeholder:text-muted-foreground/60 resize-none outline-none input-focus-glow font-mono"
          rows={6}
          disabled={busy}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* URL count + submit row */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {input.trim().length > 0 ? (
            <>
              {validUrls.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Link className="h-3 w-3" />
                  <span>
                    {validUrls.length} valid url{validUrls.length !== 1 ? "s" : ""} found
                  </span>
                </span>
              ) : (
                <span>no valid urls detected</span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <ClipboardPaste className="h-3 w-3" />
              paste your urls above
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={validUrls.length === 0 || busy}
          className="border-l border-border bg-foreground text-background hover:bg-foreground/90 px-5 sm:px-6 text-sm transition-colors disabled:opacity-50 btn-press touch-target"
        >
          {busy ? "shortening..." : "shorten all"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div
          className="border border-border bg-card animate-fade-in"
        >
          <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>
              results
              {successfulResults.length > 0 &&
                ` — ${successfulResults.length}/${results.length} succeeded`}
            </span>
            {successfulResults.length > 0 && (
              <div className="relative" ref={copyMenuRef}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleCopyAllUrls}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 border border-border bg-background hover:bg-accent touch-target rounded-none rounded-l-sm"
                  >
                    <Copy className="h-3 w-3" /> copy all
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
                {copyMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 border border-border bg-card min-w-[180px] animate-fade-in shadow-md">
                    <button
                      type="button"
                      onClick={handleCopyAllUrls}
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      copy all urls
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={handleCopyAsCsv}
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <ClipboardPaste className="h-3 w-3 shrink-0" />
                      copy as csv
                    </button>
                    <hr className="hr-dashed border-0" />
                    <button
                      type="button"
                      onClick={handleCopyAsJson}
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 touch-target"
                    >
                      <ClipboardPaste className="h-3 w-3 shrink-0" />
                      copy as json
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {results.map((r, i) => (
            <div key={i}>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-3">
                  {r.status === "loading" && (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      <span className="truncate">{r.destination_url}</span>
                    </span>
                  )}
                  {r.status === "idle" && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {r.destination_url}
                    </span>
                  )}
                  {r.status === "success" && (
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <Check className="h-3 w-3 shrink-0 text-[#2c6e49]" />
                      <a
                        href={r.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:underline truncate font-mono"
                      >
                        {r.short_url}
                      </a>
                      <span className="text-muted-foreground/60 shrink-0">→</span>
                      <span className="text-muted-foreground truncate">
                        {r.destination_url}
                      </span>
                    </div>
                  )}
                  {r.status === "error" && (
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <span className="text-destructive shrink-0">✕</span>
                      <span className="text-muted-foreground truncate">
                        {r.destination_url}
                      </span>
                    </div>
                  )}
                </div>
                {r.status === "error" && r.error && (
                  <span className="text-[10px] text-destructive shrink-0 text-right max-w-[140px] truncate">
                    {r.error}
                  </span>
                )}
              </div>
              {i < results.length - 1 && <hr className="hr-dashed border-0" />}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}