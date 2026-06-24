"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export function SignOutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="w-8 h-8 flex items-center justify-center border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Sign out"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 touch-target px-1 py-1 inline-flex items-center gap-1.5"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{busy ? "..." : "sign out"}</span>
    </button>
  );
}
