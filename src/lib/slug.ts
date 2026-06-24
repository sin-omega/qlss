const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "stats",
  "links",
  "login",
  "signin",
  "signup",
  "logout",
  "admin",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "site.webmanifest",
]);

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,32}$/.test(slug);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export async function isBannedSlug(
  slug: string,
  serviceClient: { from: (table: string) => { select: (columns: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } } } },
): Promise<boolean> {
  const { data } = await serviceClient
    .from("banned_slugs")
    .select("id")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  return data !== null;
}
