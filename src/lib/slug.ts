<<<<<<< HEAD
const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "stats",
  "links",
=======
/**
 * Slug helpers — shared between the shorten API, the redirect route, and
 * the stats page so they all agree on what a slug looks like and which
 * slugs are off-limits.
 *
 * All slugs are lowercase-only. Comparison is case-insensitive
 * everywhere: the redirect route lowercases the URL slug before
 * looking it up, so `/MyLink` and `/mylink` resolve to the same row.
 */

// Slugs that would collide with app routes — never allowed as custom
// aliases. Comparison is case-insensitive.
const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "dashboard",
  "stats",
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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
<<<<<<< HEAD
  "unshorten",
]);

=======
]);

/**
 * Returns the normalized (lowercased, trimmed) form of a slug.
 * Use this everywhere a slug is read from user input or a URL.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

<<<<<<< HEAD
=======
/**
 * True if `slug` matches the custom-alias format:
 *   - 3–32 chars
 *   - lowercase letters, digits, hyphens only
 *
 * Note: this validates the NORMALIZED form — callers should lowercase
 * first (or call `normalizeSlug`) before passing in.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,32}$/.test(slug);
}

<<<<<<< HEAD
=======
/**
 * True if `slug` would shadow a built-in app route. Always call this
 * AFTER normalizing — the comparison is case-insensitive.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
