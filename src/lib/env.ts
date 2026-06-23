import { z } from "zod";

// ─── Schema ────────────────────────────────────────────────────────────────
//
// All environment variables are validated through a single zod schema so that
// misconfiguration fails loudly at startup instead of producing confusing
// runtime errors.
//
// Supabase variables are optional — the app intentionally runs in a
// "not configured" mode when they are missing (used for previews / sandboxes).
const envSchema = z.object({
  // Supabase (optional — app degrades gracefully when unset)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Site origin
  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  // Unshorten API token (server-side secret). Required for /api/unshorten.
  UNSHORTEN_API_TOKEN: z.string().optional(),

  // Public mirror of the unshorten token that the in-browser tab sends.
  NEXT_PUBLIC_UNSHORTEN_API_TOKEN: z.string().optional(),

  // Vercel auto-injects this — used as a fallback for siteOrigin()
  VERCEL_URL: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("[env] invalid environment configuration:", parsed.error.flatten().fieldErrors);
    // Fall back to raw process.env so the app still boots (Next dev experience)
    return process.env as unknown as Env;
  }
  return parsed.data;
}

export const env = loadEnv();

// ─── Helpers ───────────────────────────────────────────────────────────────

export function isSupabaseConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * The token external API consumers must present to call /api/unshorten.
 * Accepts either the server-side secret or the public mirror (so the built-in
 * browser tab works when both are set to the same value).
 */
export function unshortenTokens(): string[] {
  const tokens: string[] = [];
  if (env.UNSHORTEN_API_TOKEN) tokens.push(env.UNSHORTEN_API_TOKEN);
  if (
    env.NEXT_PUBLIC_UNSHORTEN_API_TOKEN &&
    env.NEXT_PUBLIC_UNSHORTEN_API_TOKEN !== env.UNSHORTEN_API_TOKEN
  ) {
    tokens.push(env.NEXT_PUBLIC_UNSHORTEN_API_TOKEN);
  }
  return tokens;
}

export function siteOrigin(): string {
  let url = "";

  if (typeof window !== "undefined") {
    url = window.location.origin;
  } else {
    const siteUrl = env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      url = siteUrl;
    } else if (env.VERCEL_URL) {
      const vurl = env.VERCEL_URL;
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
