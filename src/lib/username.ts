/**
 * Username helpers — shared between the profile API and the profile
 * setup page so they agree on the format and which usernames are
 * off-limits.
 *
 * Usernames are lowercase-only and unique (case-insensitive) — see
 * the `profiles_username_lower_idx` index in schema.sql.
 */

// Usernames that would be confusing or would shadow app routes if
// ever displayed as a URL slug. Always blocked.
const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "system",
  "qlss",
  "support",
  "help",
  "about",
  "api",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "dashboard",
  "stats",
  "profile",
  "settings",
  "account",
  "me",
  "you",
  "user",
  "users",
  "null",
  "undefined",
  "true",
  "false",
  "yes",
  "no",
  "official",
  "verified",
  "staff",
  "moderator",
  "owner",
]);

/**
 * Returns the normalized (lowercased, trimmed) form of a username.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * True if `username` matches the format:
 *   - 3–20 chars
 *   - lowercase letters, digits, underscores, hyphens only
 *   - must start with a letter (no leading digit/hyphen/underscore)
 *
 * Callers should normalize first.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-z][a-z0-9_-]{2,19}$/.test(username);
}

/**
 * True if `username` is on the reserved list. Always call AFTER
 * normalizing — the comparison is case-insensitive.
 */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
