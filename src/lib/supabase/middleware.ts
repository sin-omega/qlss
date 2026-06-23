import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/service";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";

export interface BanInfo {
  type: "user" | "ip";
  reason?: string | null;
}

export interface SessionUpdateResult {
  response: NextResponse;
  userId?: string;
  ban?: BanInfo;
}

/**
 * Refreshes the Supabase auth session and (when Supabase is configured) checks
 * whether the requesting user or IP is banned.
 *
 * Returns the response to return plus optional ban info so the root middleware
 * can render the appropriate HTML ban page.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdateResult> {
  const response = NextResponse.next({ request });

  // A lightweight service client for ban lookups (uses service role when
  // available, otherwise the anon key — both work for SELECT on the
  // banned_ips / banned_usernames / profiles tables given the RLS policies).
  const supabase = createMiddlewareClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  });

  if (!supabase) {
    return { response };
  }

  // Refresh session / resolve user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = clientIp(request);

  // ── IP ban check (applies to everyone, anon or authed) ───────────────────
  if (ip) {
    try {
      const lookupClient = banLookupClient();
      if (lookupClient) {
        const { data: ipBan } = await lookupClient
          .from("banned_ips")
          .select("reason")
          .eq("ip_address", ip)
          .maybeSingle();
        if (ipBan) {
          return {
            response,
            ban: { type: "ip", reason: ipBan.reason ?? null },
          };
        }
      }
    } catch (err) {
      // Never block on a lookup failure
      console.warn("[middleware] ip ban lookup failed:", err);
    }
  }

  // ── User ban check ───────────────────────────────────────────────────────
  if (user) {
    try {
      const lookupClient = banLookupClient();
      if (lookupClient) {
        const { data: profile } = await lookupClient
          .from("profiles")
          .select("banned, banned_reason")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.banned) {
          return {
            response,
            userId: user.id,
            ban: {
              type: "user",
              reason: profile.banned_reason ?? null,
            },
          };
        }
      }
    } catch (err) {
      console.warn("[middleware] user ban lookup failed:", err);
    }
  }

  return { response, userId: user?.id };
}

/**
 * Build a Supabase client suitable for ban lookups. Prefers the service role
 * key; falls back to the anon key (RLS allows public SELECT on the relevant
 * tables). Returns null when Supabase is not configured at all.
 */
function banLookupClient() {
  if (!isSupabaseConfigured()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Extract the client IP from common proxy headers. */
export function clientIp(request: NextRequest): string | null {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "";
  const trimmed = forwardedFor.trim();
  if (trimmed) return trimmed.split(",")[0]?.trim() ?? null;
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}
