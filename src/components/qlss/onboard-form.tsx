"use client";

import { useState } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

export function OnboardForm({ email }: { email: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = USERNAME_RE.test(username.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError(t("onboard.username_invalid"));
      return;
    }
    if (!tosAccepted) {
      setError(t("onboard.tos_required"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          tos_accepted: tosAccepted,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError(
            json?.error?.toLowerCase().includes("reserved")
              ? t("onboard.username_reserved")
              : t("onboard.username_taken"),
          );
        } else {
          setError(json?.error ?? t("common.something_went_wrong"));
        }
        return;
      }
      toast({ title: t("onboard.success"), duration: 1500 });
      setTimeout(() => router.push("/"), 600);
    } catch {
      setError(t("common.something_went_wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
            {t("onboard.username_label")}
          </label>
          <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors input-focus-glow">
            <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("onboard.username_placeholder")}
              className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
              autoComplete="off"
              spellCheck={false}
              maxLength={30}
              autoFocus
            />
            {valid && (
              <span className="pr-3 flex items-center" style={{ color: "#2c6e49" }}>
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5">
            {t("onboard.username_hint")}
          </p>
        </div>

        {/* ToS + Privacy checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            className="mt-0.5 accent-foreground"
          />
          <span className="text-muted-foreground">
            {t("onboard.tos_label")}{" "}
            <a href="/legal/tos" className="text-foreground underline hover:opacity-70" target="_blank" rel="noopener noreferrer">
              {t("onboard.tos_link_text")}
            </a>{" "}
            {t("onboard.and")}{" "}
            <a href="/legal/privacy" className="text-foreground underline hover:opacity-70" target="_blank" rel="noopener noreferrer">
              {t("onboard.privacy_link_text")}
            </a>
            .
          </span>
        </label>

        {error && (
          <div className="border border-destructive/20 bg-destructive/5 px-3 py-2 flex items-start gap-2 animate-error-shake">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive leading-relaxed">{error}</p>
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
              {t("onboard.saving")}
            </>
          ) : (
            t("onboard.submit_btn")
          )}
        </button>

        <div className="text-center pt-1">
          <span className="text-[10px] text-muted-foreground">
            {t("onboard.signed_in_as")}{" "}
            <span className="text-foreground">{email}</span>
          </span>
          <span className="mx-2 text-muted-foreground/30">·</span>
          <Link
            href="/api/logout"
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("onboard.sign_out")}
          </Link>
        </div>
      </form>
    </>
  );
}
