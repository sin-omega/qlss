"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { normalizeUsername, isValidUsername } from "@/lib/username";
import { ArrowLeft, Loader2 } from "lucide-react";

/**
 * Auth page with 3 sign-in methods:
 *
 * 1. Continue with Google — standard OAuth
 * 2. Continue with email — magic link (passwordless). If the account has a
 *    password, shows a "use password instead" link that switches to password mode.
 * 3. Continue with username — username + password sign-in
 */
export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  // Which sign-in view is active:
  // "landing" = initial 3-button screen
  // "email" = magic link flow (email input, no password)
  // "email-password" = email + password sign-in (after "use password instead")
  // "username" = username + password sign-in
  const [view, setView] = useState<
    "landing" | "email" | "email-password" | "username"
  >("landing");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "password" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    })();
  }, [configured, router, supabase]);

  // ---------------------------------------------------------------------------
  // 1. Google OAuth
  // ---------------------------------------------------------------------------
  async function handleGoogle() {
    setError(null);
    setBusy("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteOrigin()}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start Google sign-in.";
      setError(humanizeError(message));
      setBusy(null);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Email magic link (passwordless)
  // ---------------------------------------------------------------------------
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");

    try {
      const trimmed = email.trim();
      if (!trimmed.includes("@")) {
        throw new Error("Please enter a valid email address.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteOrigin()}/api/auth/callback`,
        },
      });
      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(humanizeError(message));
    } finally {
      setBusy(null);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Email + password sign-in (after "use password instead")
  // ---------------------------------------------------------------------------
  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("password");

    try {
      const trimmed = email.trim();
      if (!trimmed.includes("@")) {
        throw new Error("Please enter a valid email address.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) throw error;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(humanizeError(message));
    } finally {
      setBusy(null);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Username + password sign-in
  // ---------------------------------------------------------------------------
  async function handleUsernamePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("password");

    try {
      const trimmed = username.trim();
      const normalized = normalizeUsername(trimmed);
      if (!isValidUsername(normalized)) {
        throw new Error("Enter a valid username.");
      }

      // Look up the email for this username.
      const res = await fetch("/api/auth/lookup-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized }),
      });
      if (!res.ok) {
        throw new Error("Could not look up username. Try again.");
      }
      const json = (await res.json()) as { email: string | null };
      if (!json.email) {
        throw new Error("No account found with that username.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: json.email,
        password,
      });
      if (error) throw error;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(humanizeError(message));
    } finally {
      setBusy(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function goBack() {
    setError(null);
    setView("landing");
    setEmail("");
    setUsername("");
    setPassword("");
    setMagicLinkSent(false);
  }

  function switchToEmailPassword() {
    setError(null);
    setView("email-password");
    setMagicLinkSent(false);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="cli-grid relative h-screen w-full overflow-hidden flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between text-xs">
        <Link
          href="/"
          className="font-bold tracking-tight hover:opacity-70 transition-opacity"
        >
          QLSS
        </Link>
        {view !== "landing" ? (
          <button
            type="button"
            onClick={goBack}
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            back
          </button>
        ) : (
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            back
          </Link>
        )}
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* ---- LANDING: 3 buttons ---- */}
          {view === "landing" && !magicLinkSent && (
            <>
              <h1 className="text-lg font-bold tracking-tight mb-1 text-center">
                sign in to QLSS
              </h1>
              <p className="text-xs text-muted-foreground mb-8 text-center leading-relaxed">
                claim links &amp; view analytics
              </p>

              <div className="space-y-2.5">
                {/* Google */}
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
                  Continue with Google
                </button>

                {/* Email (magic link) */}
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
                  Continue with email
                </button>

                {/* Username + password */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("username");
                  }}
                  disabled={busy !== null || !configured}
                  className="w-full flex items-center justify-center gap-3 border border-border bg-card hover:bg-accent px-4 py-3 text-sm transition-colors disabled:opacity-50"
                >
                  <UserMark />
                  Continue with username
                </button>
              </div>

              {error && (
                <p className="mt-4 text-xs text-destructive leading-relaxed text-center">
                  ! {error}
                </p>
              )}

              {!configured && (
                <p className="mt-6 text-xs text-muted-foreground leading-relaxed border border-dashed border-border p-3 bg-card text-center">
                  <span className="text-foreground">!</span> Supabase env vars
                  not set.
                </p>
              )}
            </>
          )}

          {/* ---- EMAIL: magic link form ---- */}
          {view === "email" && !magicLinkSent && (
            <>
              <h1 className="text-lg font-bold tracking-tight mb-1 text-center">
                sign in with email
              </h1>
              <p className="text-xs text-muted-foreground mb-8 text-center leading-relaxed">
                we&apos;ll send you a magic link — no password needed
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
                    placeholder="email address"
                    className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy !== null}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-destructive leading-relaxed text-center">
                    ! {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 py-3 text-sm transition-colors disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {busy === "email" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "send magic link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={switchToEmailPassword}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  use password instead
                </button>
              </div>
            </>
          )}

          {/* ---- EMAIL: magic link sent confirmation ---- */}
          {view === "email" && magicLinkSent && (
            <div className="text-center">
              <h1 className="text-lg font-bold tracking-tight mb-3">
                check your inbox
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto mb-8">
                we sent a magic link to{" "}
                <span className="text-foreground">{email}</span>. click it to
                sign in — no password required.
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
                try a different email
              </button>
            </div>
          )}

          {/* ---- EMAIL + PASSWORD (use password instead) ---- */}
          {view === "email-password" && (
            <>
              <h1 className="text-lg font-bold tracking-tight mb-1 text-center">
                sign in with password
              </h1>
              <p className="text-xs text-muted-foreground mb-8 text-center leading-relaxed">
                enter your email and password
              </p>

              <form onSubmit={handleEmailPassword} className="space-y-4">
                <div className="flex items-center border border-border bg-card focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-sm">
                    &gt;
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email address"
                    className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy !== null}
                    autoFocus
                  />
                </div>

                <div className="flex items-center border border-border bg-card focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-sm">
                    &gt;
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy !== null}
                  />
                </div>

                {error && (
                  <p className="text-xs text-destructive leading-relaxed text-center">
                    ! {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 py-3 text-sm transition-colors disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {busy === "password" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "sign in"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("email");
                    setPassword("");
                    setMagicLinkSent(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  send magic link instead
                </button>
              </div>
            </>
          )}

          {/* ---- USERNAME + PASSWORD ---- */}
          {view === "username" && (
            <>
              <h1 className="text-lg font-bold tracking-tight mb-1 text-center">
                sign in with username
              </h1>
              <p className="text-xs text-muted-foreground mb-8 text-center leading-relaxed">
                enter your username and password
              </p>

              <form onSubmit={handleUsernamePassword} className="space-y-4">
                <div className="flex items-center border border-border bg-card focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="username"
                    className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy !== null}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="flex items-center border border-border bg-card focus-within:border-foreground transition-colors">
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-sm">
                    &gt;
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    className="flex-1 bg-transparent border-0 outline-none py-2.5 text-sm placeholder:text-muted-foreground/60"
                    disabled={busy !== null}
                  />
                </div>

                {error && (
                  <p className="text-xs text-destructive leading-relaxed text-center">
                    ! {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 py-3 text-sm transition-colors disabled:opacity-50"
                  disabled={busy !== null}
                >
                  {busy === "password" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "sign in"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 px-6 py-4 text-center text-[11px] text-muted-foreground">
        QLSS · short links
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// SVG marks
// ---------------------------------------------------------------------------

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

function UserMark() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function humanizeError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login"))
    return "Wrong email or password.";
  if (m.includes("user already registered"))
    return "An account with that email already exists.";
  if (m.includes("rate limit"))
    return "Too many attempts. Try again in a minute.";
  if (m.includes("password"))
    return "Password must be at least 6 characters.";
  if (m.includes("not found") || m.includes("no account"))
    return "No account found with that username.";
  return message;
}
