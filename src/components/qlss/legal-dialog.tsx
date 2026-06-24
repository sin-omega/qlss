"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Check, Loader2 } from "lucide-react";

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
      setError("Describe the issue (at least 10 characters).");
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
        throw new Error(data.error ?? "Failed to submit report.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">Reports are fully anonymous. A description of the issue is enough.</p>
        <div className="border border-border pt-3 mt-3">
          <div className="px-3 py-3 text-xs text-foreground flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Report submitted. Administrators will review it.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">Reports are fully anonymous. Describe the issue below.</p>
      <div className="border border-border pt-3 mt-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 px-0.5">send report</p>
        <form onSubmit={handleSendReport} className="space-y-2.5">
          <textarea
            placeholder="Describe the issue — include the short URL if possible."
            value={abuseReason}
            onChange={(e) => { setAbuseReason(e.target.value); if (error) setError(null); }}
            required
            className="w-full border border-border bg-card px-3 py-2.5 text-xs placeholder:text-muted-foreground/60 resize-none outline-none input-focus-glow"
            rows={3}
          />
          {error && <p className="text-[10px] text-destructive px-0.5">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="border border-border bg-card text-foreground hover:bg-accent px-4 py-2 text-xs transition-colors btn-press touch-target inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {sending ? "Sending..." : "send report"}
          </button>
        </form>
      </div>
    </div>
  );
}

const PRIVACY_SECTIONS = [
  {
    title: "Data Collection",
    body: "QLSS collects only the minimum data needed: the URLs you shorten, optional custom aliases, and basic analytics (approximate location, browser type, referrer) when a short link is accessed. If you sign in, we store your email address. No raw IPs are retained. All abuse reports are fully anonymous.",
  },
  {
    title: "Data Usage",
    body: "Your data is used solely to operate the service — resolving redirects, displaying link statistics, and maintaining service quality. We do not sell or share your information with third parties.",
  },
  {
    title: "Short Link Visibility",
    body: "Short links are public. Anyone with the link can access the destination. Do not share sensitive or private content through short links unless combined with a pincode.",
  },
  {
    title: "Your Rights",
    body: "You may request deletion of your data and associated links at any time by contacting us. We comply with reasonable removal requests within 30 days.",
  },
];

const TOS_SECTIONS = [
  {
    title: "Acceptable Use",
    body: "You may use QLSS to shorten legitimate URLs for personal or business purposes. You agree not to use the service for spreading malware, phishing, spam, scams, illegal content, copyright infringement, or hate speech. Any activity that violates applicable law is prohibited.",
  },
  {
    title: "Limitation of Liability",
    body: "The service is provided \"as is\" without warranty of any kind. We are not responsible for the content of external destinations. QLSS reserves the right to remove any shortened link at any time without notice.",
  },
  {
    title: "Abuse Consequences",
    body: "Abuse of the service may result in IP or account restrictions, immediate link removal, and permanent bans. We cooperate with law enforcement when required.",
  },
  {
    title: "Changes",
    body: "We may update these terms from time to time. Continued use after changes constitutes acceptance of the updated terms.",
  },
];

export function LegalDialog({ page, onClose }: LegalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!page) return;
    function handleKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [page, onClose]);

  useEffect(() => {
    if (!page) return;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [page]);

  if (!page) return null;

  const title = page === "privacy" ? "privacy policy" : page === "tos" ? "terms of service" : "report abuse";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 dialog-backdrop" />
      <div ref={dialogRef} tabIndex={-1} className="relative w-full max-w-md border border-border bg-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs font-medium uppercase tracking-widest">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 touch-target btn-press" aria-label="close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {page === "privacy" ? (
            <div className="space-y-4">
              {PRIVACY_SECTIONS.map((s) => (
                <div key={s.title}>
                  <h3 className="text-[10px] uppercase tracking-widest text-foreground font-medium mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          ) : page === "tos" ? (
            <div className="space-y-4">
              {TOS_SECTIONS.map((s) => (
                <div key={s.title}>
                  <h3 className="text-[10px] uppercase tracking-widest text-foreground font-medium mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <AbuseForm key={page} />
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground/50">last updated: june 2026</span>
          <button type="button" onClick={onClose} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors btn-press touch-target">
            close
          </button>
        </div>
      </div>
    </div>
  );
}
