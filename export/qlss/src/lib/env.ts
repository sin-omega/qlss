export function isSupabaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function siteOrigin(): string {
  let url = "";

  if (typeof window !== "undefined") {
    url = window.location.origin;
  } else {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      url = siteUrl;
    } else if (process.env.VERCEL_URL) {
      const vurl = process.env.VERCEL_URL;
      url = vurl.startsWith("http://") || vurl.startsWith("https://") ? vurl : `https://${vurl}`;
    } else {
      return "http://localhost:3000";
    }
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, "");

  // Prevent double protocol (e.g. https://https://qlss.eu)
  if (url.startsWith("https://https://") || url.startsWith("http://http://")) {
    url = url.replace(/^(https?:\/\/)(https?:\/\/)/, "$2");
  }

  // Ensure protocol exists
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url;
}
