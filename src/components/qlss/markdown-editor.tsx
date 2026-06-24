"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Eye,
  Pencil,
  Loader2,
  Check,
  ArrowLeft,
  Sparkles,
  Bold,
  Italic,
  Heading,
  Link as LinkIcon,
  Code,
  List,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { renderMarkdownClient } from "@/lib/markdown";

interface MarkdownEditorProps {
  slug: string;
  initial: {
    markdown_content: string;
    og_title: string;
    og_description: string;
    og_image: string;
    pincode: string;
    allow_comments: boolean;
  };
  lastEdited?: string | null;
  stats?: {
    use_count: number;
    created_at: string;
  };
}

export function MarkdownEditor({ slug, initial, lastEdited, stats }: MarkdownEditorProps) {
  const [allowComments, setAllowComments] = useState(initial.allow_comments);
  const [content, setContent] = useState(initial.markdown_content ?? "");
  const [ogTitle, setOgTitle] = useState(initial.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(initial.og_description ?? "");
  const [ogImage, setOgImage] = useState(initial.og_image ?? "");
  const [pincode, setPincode] = useState(initial.pincode ?? "");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const contentRef = useRef(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { contentRef.current = content; }, [content]);

  function insertMarkdown(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const current = contentRef.current;
    const selected = current.slice(start, end);
    const replacement = before + selected + after;
    setContent(current.slice(0, start) + replacement + current.slice(end));
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

  const previewHtml = useMemo(() => {
    if (!content.trim()) return "";
    try {
      return renderMarkdownClient(content);
    } catch {
      return "<p>preview error</p>";
    }
  }, [content]);

  useEffect(() => {
    if (!previewRef.current) return;
    const pres = previewRef.current.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(".md-copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "md-copy-btn";
      btn.type = "button";
      btn.textContent = "copy";
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "copied";
          setTimeout(() => (btn.textContent = "copy"), 1200);
        });
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  }, [previewHtml, view]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/links/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown_content: content,
          og_title: ogTitle,
          og_description: ogDescription,
          og_image: ogImage,
          pincode: pincode,
          allow_comments: allowComments,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? t("markdown.save_failed"));
        return;
      }
      setSaved(true);
      toast({ title: t("markdown.saved"), duration: 1500 });
    } catch {
      setError(t("markdown.save_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3" />
          /{slug}
        </Link>
        <div className="flex border border-border bg-card text-[10px]">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={`px-2.5 py-1 inline-flex items-center gap-1 transition-colors ${view === "edit" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Pencil className="h-3 w-3" />
            {t("markdown.edit_btn")}
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            className={`px-2.5 py-1 inline-flex items-center gap-1 border-l border-border transition-colors ${view === "preview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Eye className="h-3 w-3" />
            {t("markdown.preview")}
          </button>
        </div>
      </div>

      {lastEdited && (
        <p className="text-[10px] text-muted-foreground text-center">last edited {new Date(lastEdited).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      )}

      {stats && (
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span>{stats.use_count} views</span>
          {stats.created_at && (
            <span>created {new Date(stats.created_at).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}</span>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="w-full space-y-2">
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
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("markdown.content_placeholder")}
                className="w-full bg-transparent border-0 outline-none p-3 text-xs leading-relaxed placeholder:text-muted-foreground/60 resize-y font-mono"
                rows={14}
                spellCheck={false}
              />
            </div>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder={t("markdown.pincode_label")}
              className="w-full border border-border bg-card px-3 py-2 text-xs outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60"
            />
            <div className="border border-border bg-card">
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
                  className="w-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60"
                />
                <input
                  type="text"
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  placeholder={t("og.og_description_placeholder")}
                  className="w-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60"
                />
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder={t("og.og_image_placeholder")}
                  className="w-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Comments toggle */}
            <label className="flex items-center gap-2 border border-border bg-background px-3 py-2 cursor-pointer hover:bg-accent/20 transition-colors select-none">
              <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="accent-foreground" disabled={busy} />
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">enable comments</span>
            </label>
          </>
        ) : (
          <div className="border border-border bg-card min-h-[200px]">
            <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("markdown.preview")}
            </div>
            {content.trim() ? (
              <div
                ref={previewRef}
                className="md-preview p-4 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground/50">
                {t("markdown.empty_preview")}
              </div>
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
          disabled={busy}
          className="w-full bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 btn-press touch-target inline-flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("common.saving")}
            </>
          ) : saved ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {t("markdown.saved")}
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              {t("markdown.save_btn")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
