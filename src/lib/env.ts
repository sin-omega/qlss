/**
 * Tiny helper used by UI code to detect whether Supabase env vars
 * are present. We use this purely to render a friendly "set up your
 * environment" notice during local development — never as a security
 * gate.
 */
export function isSupabaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Build the canonical site origin.
 *
 * - Client-side: prefer `window.location.origin` (always correct for
 *   the page the user is actually on — never falls back to localhost
 *   in production).
 * - Server-side: use NEXT_PUBLIC_SITE_URL, then VERCEL_URL (server-only),
 *   then fall back to localhost for dev.
 *
 * The client branch is important because VERCEL_URL is NOT exposed to the
 * browser (it's not NEXT_PUBLIC_ prefixed), so the old version of this
 * function would silently fall back to http://localhost:3000 in the
 * browser on Vercel — which broke Google OAuth redirects.
 */
export function siteOrigin(): string {
  // Client-side: the browser always knows its own origin.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side: use env vars.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
