"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Link2, Lock, Check, X, Plus } from "lucide-react";

interface LinkedAccountsProps {
  initialProviders: string[];
}

/**
 * UI for managing the auth methods linked to the current user.
 *
 * - Email/password row:
 *   - If already linked: shows a "✓ linked" badge.
 *   - If not linked: shows an "add password" button that reveals an
 *     inline password input + "save" button when clicked.
 *     Calls `supabase.auth.updateUser({ password })`.
 *
 * - Google row:
 *   - If linked: shows a "✓ linked" badge.
 *   - If not linked: shows a "link Google" button that starts the OAuth
 *     link flow via `supabase.auth.linkIdentity({ provider: "google" })`.
 */
export function LinkedAccounts({ initialProviders }: LinkedAccountsProps) {
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

  async function handleSavePassword(e: React.FormEvent) {
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
      setSuccess(
        hasPassword
          ? "Password changed. Use the new password next time you sign in."
          : "Password added. You can now sign in with your email + password.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save password.";
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
      // Browser will redirect to Google. On return, the user will have
      // a new identity linked. We don't need to do anything else here.
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

            {/* Button: "add password" if not set, "change password" if set */}
            {!showPasswordInput && (
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                className="text-xs text-foreground border border-border bg-background hover:bg-accent px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
              >
                {hasPassword ? (
                  "change password"
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    add password
                  </>
                )}
              </button>
            )}
          </div>

          {/* Inline password input — revealed only when the button is clicked */}
          {showPasswordInput && (
            <form
              onSubmit={handleSavePassword}
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
                  placeholder={
                    hasPassword
                      ? "new password (min 6 chars)"
                      : "new password (min 6 chars)"
                  }
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
