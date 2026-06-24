"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FileText,
  Eye,
  Pencil,
  Loader2,
  Check,
  Copy,
  Lock,
  ExternalLink,
  Sparkles,
  Bold,
  Italic,
  Heading,
  Link as LinkIcon,
  Code,
  List,
  Timer,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Tag,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { t, getLanguage } from "@/lib/i18n";
import { renderMarkdownClient } from "@/lib/markdown";

interface CreatedMarkdown {
  slug: string;
  short_url: string;
}

const EXPIRY_OPTIONS: { key: string; seconds: number | null }[] = [
  { key: "expiry.never", seconds: null },
  { key: "expiry.1_hour", seconds: 3600 },
  { key: "expiry.24_hours", seconds: 86400 },
  { key: "expiry.7_days", seconds: 604800 },
  { key: "expiry.30_days", seconds: 2592000 },
  { key: "expiry.90_days", seconds: 7776000 },
];

export function MarkdownForm({ signedIn }: { signedIn: boolean }) {
  const [content, setContent] = useState("");
  const [alias, setAlias] = useState("");
  const [pincode, setPincode] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMarkdown | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expiryIndex, setExpiryIndex] = useState(0);
  const [maxUses, setMaxUses] = useState("");
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const charCount = content.length;
  const expiryOption = EXPIRY_OPTIONS[expiryIndex];
  const previewHtml = useMemo(() => {
    if (!content.trim()) return "";
    try {
      return renderMarkdownClient(content);
    } catch {
      return `<p>${t("markdown.preview_error")}</p>`;
    }
  }, [content]);

  function insertMarkdown(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = before + selected + after;
    setContent(content.slice(0, start) + replacement + content.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  const toolbar = [
    { icon: Bold, label: "Bold", action: () => insertMarkdown("**", "**") },
    { icon: Italic, label: "Italic", action: () => insertMarkdown("*", "*") },
    { icon: Heading, label: "Heading", action: () => insertMarkdown("## ", "") },
    { icon: LinkIcon, label: "Link", action: () => insertMarkdown("[", "](url)") },
    { icon: Code, label: "Code", action: () => insertMarkdown("`", "`") },
    { icon: List, label: "List", action: () => insertMarkdown("- ", "") },
  ];

  // Inject copy buttons into rendered code blocks
  useEffect(() => {
    if (!previewRef.current) return;
    const pres = previewRef.current.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(".md-copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "md-copy-btn";
      btn.type = "button";
      btn.textContent = t("common.copy");
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        navigator.clipboard.writeText(code).then(
          () => {
            btn.textContent = t("common.copied");
            toast({ title: t("common.copied"), duration: 1200 });
            setTimeout(() => (btn.textContent = t("common.copy")), 1200);
          },
          () => {
            btn.textContent = t("common.error");
            setTimeout(() => (btn.textContent = t("common.copy")), 1200);
          },
        );
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  }, [previewHtml, view]);

  if (!signedIn) {
    return (
      <div className="border border-border bg-card py-12 px-6 text-center animate-fade-in">
        <Lock className="h-6 w-6 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-xs text-muted-foreground mb-3">
          {t("markdown.sign_in_required")}
        </p>
        <Link
          href="/auth"
          className="inline-flex items-center gap-1.5 text-xs text-foreground border border-border bg-card hover:bg-accent px-4 py-2 transition-colors btn-press"
        >
          {t("header.sign_in")}
        </Link>
      </div>
    );
  }

  if (created) {
    return (
      <div className="w-full space-y-3 animate-fade-in">
        <div className="border border-border bg-card card-hover">
          <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Check className="h-3 w-3" style={{ color: "#2c6e49" }} />
              {t("markdown.created")}
            </span>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setContent("");
                setAlias("");
                setPincode("");
                setOgTitle("");
                setOgDescription("");
                setOgImage("");
                setExpiryIndex(0);
                setMaxUses("");
                setView("edit");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              {t("home.new_link")}
            </button>
          </div>
          <div className="px-4 py-4 flex flex-col gap-2">
            <a
              href={created.short_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline break-all font-medium inline-flex items-center gap-1.5"
            >
              {created.short_url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(created.short_url);
                  toast({ title: t("home.link_copied"), duration: 1500 });
                }}
                className="text-[11px] border border-border bg-card hover:bg-accent px-3 py-1.5 transition-colors inline-flex items-center gap-1.5 btn-press"
              >
                <Copy className="h-3 w-3" />
                {t("common.copy")}
              </button>
              <Link
                href={`/${created.slug}/edit`}
                className="text-[11px] border border-border bg-card hover:bg-accent px-3 py-1.5 transition-colors inline-flex items-center gap-1.5 btn-press"
              >
                <Pencil className="h-3 w-3" />
                {t("markdown.edit_btn")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError(t("api_errors.markdown_required"));
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        link_type: "markdown",
        markdown_content: content,
        custom_slug: alias || undefined,
        pincode: pincode || undefined,
        og_title: ogTitle || undefined,
        og_description: ogDescription || undefined,
        og_image: ogImage || undefined,
      };
      body.allow_comments = allowComments;
      if (expiryOption.seconds !== null) {
        body.expires_in = expiryOption.seconds;
      }
      const mu = parseInt(maxUses, 10);
      if (Number.isFinite(mu) && mu > 0) {
        body.max_uses = mu;
      }
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? t("api_errors.create_failed"));
        return;
      }
      setCreated({
        slug: json.slug,
        short_url: json.short_url,
      });
    } catch {
      setError(t("api_errors.create_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{t("markdown.description")}</p>
        {/* Edit / preview toggle */}
        <div className="flex border border-border bg-card text-[10px]">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={`px-2.5 py-1 inline-flex items-center gap-1 transition-colors ${
              view === "edit" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pencil className="h-3 w-3" />
            {t("markdown.edit_btn")}
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            className={`px-2.5 py-1 inline-flex items-center gap-1 border-l border-border transition-colors ${
              view === "preview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" />
            {t("markdown.preview")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-2">
        {view === "edit" ? (
          <>
            <div className="border border-border bg-card focus-within:border-foreground transition-colors">
              <div className="flex items-center justify-between px-1 py-1 border-b border-border">
                <div className="flex items-center gap-0.5">
                  {toolbar.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={t.action}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title={t.label}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums px-1">{charCount}</span>
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("markdown.content_placeholder")}
                className="w-full bg-transparent border-0 outline-none p-3 text-xs leading-relaxed placeholder:text-muted-foreground/60 resize-y font-mono"
                rows={14}
                spellCheck={false}
                autoFocus
              />
            </div>

            {/* Advanced options */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 touch-target"
              >
                {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                advanced options
              </button>
            </div>

            {advancedOpen && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">/</span>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.toLowerCase())}
                    placeholder="custom alias"
                    className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                  />
                  {alias && (
                    <button type="button" onClick={() => setAlias("")} className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      clear
                    </button>
                  )}
                </div>

                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                    <KeyRound className="h-3 w-3" />
                  </span>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="pincode (optional)"
                    className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                  />
                  {pincode && (
                    <button type="button" onClick={() => setPincode("")} className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      clear
                    </button>
                  )}
                </div>

                {/* Expiry */}
                <div className="border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setExpiryOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-3 w-3" />
                      expires
                      {expiryOption.seconds !== null && (
                        <span className="text-[9px] bg-accent px-1 py-px border border-border">
                          {t(expiryOption.key)}
                        </span>
                      )}
                    </span>
                    {expiryOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {expiryOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      <select
                        value={expiryIndex}
                        onChange={(e) => setExpiryIndex(Number(e.target.value))}
                        className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none appearance-none"
                        disabled={busy}
                      >
                        {EXPIRY_OPTIONS.map((opt, i) => (
                          <option key={i} value={i}>{t(opt.key)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Max uses */}
                <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-xs flex items-center">
                    <Timer className="h-3 w-3" />
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="max uses (optional)"
                    className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy}
                    autoComplete="off"
                  />
                  {maxUses && (
                    <button type="button" onClick={() => setMaxUses("")} className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      clear
                    </button>
                  )}
                </div>

                {/* OG meta */}
                <div className="border border-border bg-background">
                  <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    social preview
                  </div>
                  <div className="p-2 space-y-2">
                    <input type="text" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder="og:title" className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50" disabled={busy} />
                    <input type="text" value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} placeholder="og:description" className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50" disabled={busy} />
                    <input type="url" value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="og:image URL" className="w-full bg-background border border-border px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50" disabled={busy} />
                  </div>
                </div>

                {/* Comments toggle */}
                <label className="flex items-center gap-2 border border-border bg-background px-3 py-2 cursor-pointer hover:bg-accent/20 transition-colors select-none">
                  <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="accent-foreground" disabled={busy} />
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">enable comments</span>
                </label>
              </div>
            )}
          </>
        ) : (
          <div className="border border-border bg-card min-h-[200px]">
            <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              preview
            </div>
            {content.trim() ? (
              <div
                ref={previewRef}
                className="md-preview p-4 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground/50">nothing to preview</div>
            )}
          </div>
        )}

        {error && (
          <div className="border border-destructive/20 bg-destructive/5 px-4 py-2.5 animate-error-shake">
            <p className="text-xs text-destructive leading-relaxed">! {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !content.trim()}
          className="w-full bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 btn-press touch-target inline-flex items-center justify-center gap-2"
        >
          {busy ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> publishing</>
          ) : (
            <><FileText className="h-3.5 w-3.5" /> publish</>
          )}
        </button>
      </form>
    </div>
  );
}
