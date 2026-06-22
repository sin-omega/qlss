export function isSupabaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function siteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    // Strip trailing slash to prevent double-slash
    return siteUrl.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    // Vercel may or may not include https:// — normalize it
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url.replace(/\/+$/, "");
    }
    return `https://${url}`;
  }
  return "http://localhost:3000";
}
