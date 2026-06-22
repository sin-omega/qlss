"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Check, Loader2 } from "lucide-react";

interface LegalDialogProps {
  page: "privacy" | "tos" | "abuse" | null;
  onClose: () => void;
}

interface LegalSection {
  heading: string;
  body: string;
}

const TITLES: Record<string, string> = {
  privacy: "Privacy Policy",
  tos: "Terms of Service",
  abuse: "Report Abuse",
};

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "Data Collection",
    body: "QLSS collects minimal data to provide link shortening services. We store the destination URL, optional custom alias, and creation timestamp for each shortened link. We also collect basic analytics (IP adress, referring page, browser, device type) when a short link is accessed. We collect approximate geolocation data (country and region) derived from IP addresses when short links are accessed, for analytics purposes. We do not store raw IP addresses longer than necessary for analytics display. Abuse reports submitted through this service are fully anonymous — we do not collect or store reporter identity.",
  },
  {
    heading: "Data Usage",
    body: "Your data is used solely to operate the link shortening service — resolving redirects, displaying statistics, and maintaining service quality. We do not sell, share, or otherwise distribute your personal information to third parties.",
  },
  {
    heading: "Short Link Visibility",
    body: "Short links are public by nature — anyone with the link can access the destination. Do not use short links for sensitive or private content unless combined with a pincode.",
  },
  {
    heading: "Your Rights",
    body: "You may request deletion of your data and associated links at any time by contacting us. We comply with reasonable data removal requests within 30 days.",
  },
];

const TOS_SECTIONS: LegalSection[] = [
  {
    heading: "Acceptable Use",
    body: "By using QLSS, you agree not to use the service for any unlawful purpose, including but not limited to: spreading malware, phishing, spam, or distributing harmful content. All shortened links must comply with applicable laws. QLSS reserves the right to remove links that violate these terms and to ban accounts engaged in abuse.",
  },
  {
    heading: "Limitation of Liability",
    body: "The service is provided \"as is\" without warranty of any kind. We are not responsible for the content of external sites that shortened links point to. QLSS reserves the right to remove any shortened link at any time without notice.",
  },
  {
    heading: "Abuse Consequences",
    body: "Abuse of the service may result in IP or account restrictions, immediate link removal, and permanent bans. We cooperate with law enforcement when required.",
  },
  {
    heading: "Changes",
    body: "We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms. Major changes will be noted with an updated revision date.",
  },
  {
    heading: "Stability and shutdown",
    body: "We will try to keep the service running, but we do not guarantee uptime. In the event of a shutdown, we will provide notice and allow users to export their data where feasible.",
  }
];

const ABUSE_CONTENT =
  "Reports are fully anonymous — we do not collect your email or identity. Provide a description of the issue below, optionally including the short link slug. All reports are reviewed by administrators and appropriate action is taken, which may include removing the link and banning the creator.";

function AbuseForm() {
  const [abuseReason, setAbuseReason] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (abuseReason.trim().length < 10) {
      setError("Please describe the issue (at least 10 characters).");
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
        <p className="text-xs text-muted-foreground leading-relaxed">
          {ABUSE_CONTENT}
        </p>
        <div className="border border-border pt-3 mt-3">
          <div className="px-3 py-3 text-xs text-foreground flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span>Report submitted. Administrators will review it.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {ABUSE_CONTENT}
      </p>
      <div className="border border-border pt-3 mt-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 px-0.5">
          send report
        </p>
        <form onSubmit={handleSendReport} className="space-y-2.5">
          <textarea
            placeholder="describe the issue — include the short url"
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
            <p className="text-[10px] text-red-400 px-0.5">{error}</p>
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
            {sending ? "sending..." : "send report"}
          </button>
        </form>
      </div>
    </div>
  );
}

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

  const title = TITLES[page] ?? "";

  function renderContent() {
    switch (page) {
      case "privacy":
        return (
          <div className="space-y-4">
            {PRIVACY_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-[10px] uppercase tracking-widest text-foreground font-medium mb-1.5">
                  {section.heading}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        );
      case "tos":
        return (
          <div className="space-y-4">
            {TOS_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-[10px] uppercase tracking-widest text-foreground font-medium mb-1.5">
                  {section.heading}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {section.body}
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
            last updated: june 2025
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors btn-press touch-target"
          >
            close
          </button>
        </div>
      </div>
    </div>
  );
}