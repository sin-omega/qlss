"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Check, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

interface LegalDialogProps {
  page: "privacy" | "tos" | "abuse" | null;
  onClose: () => void;
}

function AbuseForm() {
  const [abuseReason, setAbuseReason] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (abuseReason.trim().length < 10) {
      setError(t("legal_dialog.report_min_length_error"));
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: abuseReason.trim(), slug: "" }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? t("legal_dialog.report_submit_failed"));
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.something_went_wrong"));
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("legal_dialog.abuse_anonymous_note")}
        </p>
        <div className="border border-border pt-3 mt-3">
          <div className="px-3 py-3 text-xs text-foreground flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{t("legal_dialog.report_submitted")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("legal_dialog.abuse_anonymous_note")}
      </p>
      <div className="border border-border pt-3 mt-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 px-0.5">
          {t("legal_dialog.send_report")}
        </p>
        <form onSubmit={handleSendReport} className="space-y-2.5">
          <textarea
            placeholder={t("legal_dialog.report_placeholder")}
            value={abuseReason}
            onChange={(e) => {
              setAbuseReason(e.target.value);
              if (error) setError(null);
            }}
            required
            className="w-full border border-border bg-card px-3 py-2.5 text-xs placeholder:text-muted-foreground/60 resize-none outline-none input-focus-glow"
            rows={3}
          />
          {error && (
            <p className="text-[10px] text-destructive px-0.5">{error}</p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="border border-border bg-card text-foreground hover:bg-accent px-4 py-2 text-xs transition-colors btn-press touch-target inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {sending ? t("common.sending") : t("legal_dialog.send_report")}
          </button>
        </form>
      </div>
    </div>
  );
}

const PRIVACY_SECTIONS = [
  { titleKey: "legal_dialog.privacy_data_collection_title", bodyKey: "legal_dialog.privacy_data_collection_text" },
  { titleKey: "legal_dialog.privacy_data_usage_title", bodyKey: "legal_dialog.privacy_data_usage_text" },
  { titleKey: "legal_dialog.privacy_visibility_title", bodyKey: "legal_dialog.privacy_visibility_text" },
  { titleKey: "legal_dialog.privacy_dialog_rights_title", bodyKey: "legal_dialog.privacy_dialog_rights_text" },
] as const;

const TOS_SECTIONS = [
  { titleKey: "legal_dialog.tos_acceptable_use_title", bodyKey: "legal_dialog.tos_acceptable_use_text" },
  { titleKey: "legal_dialog.tos_limitation_title", bodyKey: "legal_dialog.tos_limitation_text" },
  { titleKey: "legal_dialog.tos_consequences_title", bodyKey: "legal_dialog.tos_consequences_text" },
  { titleKey: "legal_dialog.tos_dialog_changes_title", bodyKey: "legal_dialog.tos_dialog_changes_text" },
  { titleKey: "legal_dialog.tos_shutdown_title", bodyKey: "legal_dialog.tos_shutdown_text" },
] as const;

export function LegalDialog({ page, onClose }: LegalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!page) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [page, onClose]);

  // Trap focus
  useEffect(() => {
    if (!page) return;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [page]);

  if (!page) return null;

  const title =
    page === "privacy"
      ? t("legal.privacy")
      : page === "tos"
        ? t("legal.tos")
        : t("legal.abuse");

  function renderContent() {
    switch (page) {
      case "privacy":
        return (
          <div className="space-y-4">
            {PRIVACY_SECTIONS.map((section) => (
              <div key={section.titleKey}>
                <h3 className="text-[10px] uppercase tracking-widest text-foreground font-medium mb-1.5">
                  {t(section.titleKey)}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(section.bodyKey)}
                </p>
              </div>
            ))}
          </div>
        );
      case "tos":
        return (
          <div className="space-y-4">
            {TOS_SECTIONS.map((section) => (
              <div key={section.titleKey}>
                <h3 className="text-[10px] uppercase tracking-widest text-foreground font-medium mb-1.5">
                  {t(section.titleKey)}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(section.bodyKey)}
                </p>
              </div>
            ))}
          </div>
        );
      case "abuse":
        // Key on page so form state resets when switching tabs
        return <AbuseForm key={page} />;
      default:
        return null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 dialog-backdrop" />

      {/* Modal */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md border border-border bg-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs font-medium uppercase tracking-widest">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 touch-target btn-press"
            aria-label={t("common.close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground/50">
            {t("legal.last_updated")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors btn-press touch-target"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
