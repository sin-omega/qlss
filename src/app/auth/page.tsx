"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { SiteFooter } from "@/components/qlss/site-footer";
import { t } from "@/lib/i18n";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<"landing" | "email">("landing");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSignedIn(true);
        router.replace("/");
      }
    })();
  }, [configured, router, supabase]);

  async function handleGoogle() {
    setError(null);
    setBusy("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteOrigin()}/api/auth/callback?next=/`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.err_google");
      setError(humanizeError(message));
      setBusy(null);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");

    try {
      const trimmed = email.trim();
      if (!trimmed.includes("@")) {
        throw new Error(t("auth.err_invalid_email"));
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteOrigin()}/api/auth/callback?next=/`,
        },
      });
      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("common.something_went_wrong");
      setError(humanizeError(message));
    } finally {
      setBusy(null);
    }
  }

  function goBack() {
    setError(null);
    setView("landing");
    setEmail("");
    setMagicLinkSent(false);
  }

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={signedIn} isAdmin={false} backHref="/" backLabel={t("common.home")} />
      <div className="header-accent-line" />

      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
        <div className="w-full max-w-sm animate-page-enter">
          {view === "landing" && !magicLinkSent && (
            <>
              <h1 className="text-lg font-bold tracking-tight mb-1 text-center">
                {t("auth.sign_in_title")}
              </h1>
              <p className="text-xs text-muted-foreground mb-8 text-center leading-relaxed">
                {t("auth.sign_in_subtitle")}
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy !== null || !configured}
                  className="w-full flex items-center justify-center gap-3 border border-border bg-card hover:bg-accent px-4 py-3 text-sm transition-colors disabled:opacity-50"
                >
                  {busy === "google" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleMark />
                  )}
                  {t("auth.continue_google")}
                </button>

                <div className="relative flex items-center gap-3 py-1">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("auth.or")}</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("email");
                  }}
                  disabled={busy !== null || !configured}
                  className="w-full flex items-center justify-center gap-3 border border-border bg-card hover:bg-accent px-4 py-3 text-sm transition-colors disabled:opacity-50"
                >
                  <EmailMark />
                  {t("auth.continue_email")}
                </button>
              </div>

              {error && (
                <div className="mt-4 border border-destructive/20 bg-destructive/5 px-4 py-2.5">
                  <p className="text-xs text-destructive leading-relaxed text-center">
                    ! {error}
                  </p>
                </div>
              )}

              {!configured && (
                <div className="mt-6 border border-dashed border-border p-3 bg-card text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground">!</span> {t("auth.not_configured")}
                  </p>
                </div>
              )}
            </>
          )}

          {view === "email" && !magicLinkSent && (
            <>
              <div className="flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={goBack}
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {t("common.back")}
                </button>
              </div>
              <h1 className="text-lg font-bold tracking-tight mb-1 text-center">
                {t("auth.sign_in_email_title")}
              </h1>
              <p className="text-xs text-muted-foreground mb-8 text-center leading-relaxed">
                {t("auth.sign_in_email_subtitle")}
              </p>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="flex items-center border border-border bg-card focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-sm">
                    &gt;
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.email_placeholder")}
                    className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy !== null}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="border border-destructive/20 bg-destructive/5 px-4 py-2.5">
                    <p className="text-xs text-destructive leading-relaxed text-center">
                      ! {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 py-3 text-sm transition-colors disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {busy === "email" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    t("auth.send_magic_link")
                  )}
                </button>
              </form>
            </>
          )}

          {view === "email" && magicLinkSent && (
            <div className="text-center">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-lg font-bold tracking-tight mb-3">
                {t("auth.check_inbox")}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto mb-8">
                {t("auth.magic_link_sent").replace("{email}", email)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("auth.try_different_email")}
              </button>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function EmailMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  );
}

function humanizeError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return t("auth.err_invalid_login");
  if (m.includes("user already registered"))
    return t("auth.err_already_registered");
  if (m.includes("rate limit"))
    return t("auth.err_rate_limit");
  if (m.includes("password"))
    return t("auth.err_password");
  if (m.includes("not found") || m.includes("no account"))
    return t("auth.err_not_found");
  return message;
}
