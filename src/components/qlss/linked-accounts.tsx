"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { siteOrigin } from "@/lib/env";
import { Loader2, Link2, Lock, Check, X, Plus } from "lucide-react";

interface LinkedAccountsProps {
  initialProviders: string[];
  userEmail: string | undefined;
}

/**
 * UI for managing auth methods linked to the current user.
 */
export function LinkedAccounts({ initialProviders, userEmail }: LinkedAccountsProps) {
  const supabase = createClient();
  const [providers, setProviders] = useState<string[]>(initialProviders);
  const [busy, setBusy] = useState<"password" | "google" | null>(null);
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setProviders(initialProviders);
  }, [initialProviders]);

  const hasPassword = providers.includes("email");
  const hasGoogle = providers.includes("google");

  async function handleAddPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy("password");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setProviders((p) => Array.from(new Set([...p, "email"])));
      setPassword("");
      setShowPasswordInput(false);
      setSuccess("Password added. You can now sign in with your email + password.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save password.";
      setError(humanizeError(message));
    } finally {
      setBusy(null);
    }
  }

  async function handleChangePassword() {
    if (!userEmail) return;
    setError(null);
    setSuccess(null);
    setBusy("password");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${siteOrigin()}/auth`,
      });
      if (error) throw error;

      setSuccess("Password reset email sent. Check your inbox.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not send reset email.";
      setError(humanizeError(message));
    } finally {
      setBusy(null);
    }
  }

  async function handleLinkGoogle() {
    setError(null);
    setSuccess(null);
    setBusy("google");

    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
      });
      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not link Google.";
      setError(humanizeError(message));
      setBusy(null);
    }
  }

  return (
    <div className="border border-border bg-card">
      <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
        linked sign-in methods
      </div>

      <ul className="divide-y divide-border">
        {/* Email/password row */}
        <li className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm">Email + password</span>
              {hasPassword && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                  <Check className="h-2.5 w-2.5" /> linked
                </span>
              )}
            </div>

            {/* No password set: show "add password" which reveals inline input */}
            {!hasPassword && !showPasswordInput && (
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                className="text-xs text-foreground border border-border bg-background hover:bg-accent px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3 w-3" />
                add password
              </button>
            )}

            {/* Has password: "change password" sends reset email */}
            {hasPassword && (
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={busy !== null}
                className="text-xs text-foreground border border-border bg-background hover:bg-accent px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {busy === "password" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "change password"
                )}
              </button>
            )}
          </div>

          {/* Inline password input — only for adding a new password */}
          {!hasPassword && showPasswordInput && (
            <form
              onSubmit={handleAddPassword}
              className="mt-3 flex items-stretch gap-2"
            >
              <div className="flex items-stretch flex-1 border border-border bg-background focus-within:border-foreground transition-colors">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-sm flex items-center">
                  &gt;
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="new password (min 6 chars)"
                  className="flex-1 bg-transparent border-0 outline-none py-2 text-sm placeholder:text-muted-foreground/60"
                  disabled={busy !== null}
                />
              </div>
              <button
                type="submit"
                className="bg-foreground text-background hover:bg-foreground/90 px-4 text-xs transition-colors disabled:opacity-50"
                disabled={busy !== null || !password}
              >
                {busy === "password" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "save"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordInput(false);
                  setPassword("");
                  setError(null);
                }}
                disabled={busy !== null}
                className="text-muted-foreground hover:text-foreground px-2"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </li>

        {/* Google row */}
        <li className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm">Google</span>
              {hasGoogle && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                  <Check className="h-2.5 w-2.5" /> linked
                </span>
              )}
            </div>

            {!hasGoogle && (
              <button
                type="button"
                onClick={handleLinkGoogle}
                disabled={busy !== null}
                className="text-xs text-foreground border border-border bg-background hover:bg-accent px-3 py-1.5 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === "google" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    link Google
                  </>
                )}
              </button>
            )}
          </div>
        </li>
      </ul>

      {error && (
        <p className="px-4 py-2 border-t border-border text-xs text-destructive flex items-start gap-1.5">
          <X className="h-3 w-3 mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="px-4 py-2 border-t border-border text-xs text-foreground/80 flex items-start gap-1.5">
          <Check className="h-3 w-3 mt-0.5 shrink-0" /> {success}
        </p>
      )}
    </div>
  );
}

function humanizeError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("password")) return "Password must be at least 6 characters.";
  if (m.includes("same password")) return "That's already your password.";
  if (m.includes("identity already")) return "Google is already linked to your account.";
  return message;
}
