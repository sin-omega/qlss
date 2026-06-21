import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { normalizeUsername, isReservedUsername } from "@/lib/username";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProfileViewTracker } from "@/components/qlss/profile-view-tracker";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  username: string;
  description: string | null;
  created_at: string;
  settings: Record<string, unknown> | null;
}

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

/**
 * Public user profile page at /@username (rewritten from /u/[username]).
 * Clean, carrd-style layout with theme/color customization.
 */
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-lg font-bold tracking-tight">Almost ready.</h1>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Add Supabase env vars to enable user pages.
          </p>
        </div>
      </main>
    );
  }

  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);

  if (!username || isReservedUsername(username)) {
    notFound();
  }

  const serviceClient = createServiceClient();

  const { data: profileRow } = await serviceClient
    .from("profiles")
    .select("id, username, description, created_at, settings")
    .ilike("username", username)
    .maybeSingle();

  const profile = profileRow as ProfileRow | null;
  if (!profile) notFound();

  // Parse settings
  const s = profile.settings ?? {};
  const themeColor = (s.theme_color as string) || "";
  const bgColor = (s.bg_color as string) || "";
  const layout = (s.layout as string) || "list";
  const linkStyle = (s.link_style as string) || "bordered";
  const fontStyle = (s.font_style as string) || "mono";
  const showDescriptions = s.show_descriptions !== false;
  const showDestination = s.show_destination !== false;
  const displayName = (s.display_name as string) || "";
  const bio = (s.bio as string) || profile.description || "";
  const socialLinks = (s.social_links as SocialLink[]) || [];
  const avatarEmoji = (s.avatar_emoji as string) || "";
  const bannerUrl = (s.banner_url as string) || "";
  const borderRadiusSetting = (s.border_radius as string) || "sharp";
  const ctaText = (s.cta_text as string) || "";
  const ctaUrl = (s.cta_url as string) || "";
  const statusText = (s.status_text as string) || "";

  const isDark = [
    "#0f172a", "#1e293b", "#334155", "#1e1b4b",
  ].includes(bgColor);

  const accentColor = themeColor || (isDark ? "#60a5fa" : "#0c0c0a");
  const fgColor = isDark ? "#e2e8f0" : "#0c0c0a";
  const mutedColor = isDark ? "#94a3b8" : "#6a6a64";
  const borderColor = isDark ? "#334155" : "#d9d8d0";
  const cardColor = isDark ? "#1e293b" : "#ffffff";

  const borderRadiusPx =
    borderRadiusSetting === "pill" ? 999 : borderRadiusSetting === "rounded" ? 8 : 0;

  // Find profile page folder and its links
  const { data: profileFolder } = await serviceClient
    .from("folders")
    .select("id")
    .eq("user_id", profile.id)
    .eq("profile_page", true)
    .maybeSingle();

  let links: LinkRow[] = [];
  if (profileFolder) {
    const { data: linksData } = await serviceClient
      .from("links")
      .select("id, slug, destination_url, title, description, created_at")
      .eq("user_id", profile.id)
      .eq("folder_id", profileFolder.id)
      .order("created_at", { ascending: false });
    links = (linksData ?? []) as unknown as LinkRow[];
  }

  const origin = siteOrigin();

  const fontFamily =
    fontStyle === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : fontStyle === "sans"
        ? "system-ui, -apple-system, sans-serif"
        : "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  function cardStyles(): React.CSSProperties {
    const base: React.CSSProperties = { borderRadius: borderRadiusPx };
    if (linkStyle === "bordered") {
      return { ...base, border: `1px solid ${borderColor}`, backgroundColor: cardColor };
    }
    if (linkStyle === "filled") {
      return {
        ...base,
        backgroundColor: themeColor
          ? `${themeColor}15`
          : isDark ? "#0f172a" : "#f5f5f0",
      };
    }
    return base;
  }

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: bgColor || undefined,
        fontFamily,
      }}
    >
      {/* Track profile view */}
      <ProfileViewTracker profileId={profile.id} />

      {/* Back link */}
      <div className="px-6 py-5">
        <Link
          href="/"
          className="text-xs hover:opacity-70 transition-opacity inline-flex items-center gap-1.5"
          style={{ color: mutedColor }}
        >
          <ArrowLeft className="h-3 w-3" />
          QLSS.eu
        </Link>
      </div>

      {/* Banner */}
      {bannerUrl && (
        <div
          className="w-full h-40 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
      )}

      {/* Profile header */}
      <header className="px-6 pb-8" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="mx-auto max-w-xl text-center">
          {/* Avatar */}
          {avatarEmoji && (
            <div className="text-5xl mb-2">{avatarEmoji}</div>
          )}

          <h1 className="text-3xl font-bold tracking-tight" style={{ color: accentColor }}>
            {displayName || `@${profile.username}`}
          </h1>

          {/* Status */}
          {statusText && (
            <p className="text-xs mt-1" style={{ color: accentColor }}>
              {statusText}
            </p>
          )}

          {!displayName && (
            <p className="text-[11px] mt-1" style={{ color: mutedColor }}>
              @{profile.username}
            </p>
          )}
          {bio && (
            <p className="text-sm leading-relaxed max-w-md mx-auto mt-3" style={{ color: mutedColor }}>
              {bio}
            </p>
          )}

          {/* Social links with icons */}
          {socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
              {socialLinks.map((sl, i) => (
                <a
                  key={i}
                  href={sl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 transition-opacity hover:opacity-70"
                  title={sl.platform}
                  style={{ color: accentColor }}
                >
                  {/* Inline SVG icons for each platform */}
                  {sl.platform === "github" || sl.platform === "twitter" || sl.platform === "x" || sl.platform === "instagram" || sl.platform === "linkedin" || sl.platform === "youtube" || sl.platform === "twitch" || sl.platform === "discord" || sl.platform === "website" || sl.platform === "email" ? (
                    <SocialIconSvg platform={sl.platform} />
                  ) : (
                    <ExternalLink className="w-full h-full" />
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* CTA Button */}
      {ctaText && (
        <div className="px-6 pt-6">
          <div className="mx-auto max-w-xl text-center">
            <a
              href={ctaUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium py-2.5 px-6 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: accentColor,
                color: isDark ? "#0c0c0a" : "#fbfbf9",
                borderRadius: borderRadiusPx,
              }}
            >
              {ctaText}
            </a>
          </div>
        </div>
      )}

      {/* Links */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-xl">
          {links.length === 0 ? (
            <p className="py-16 text-center text-sm" style={{ color: mutedColor }}>
              {profileFolder
                ? "No links yet."
                : "This user hasn't set up their profile page yet."}
            </p>
          ) : layout === "grid" ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {links.map((link) => (
                <li key={link.id}>
                  <a
                    href={`${origin}/${link.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 hover:opacity-80 transition-opacity"
                    style={cardStyles()}
                  >
                    <p className="text-sm font-medium" style={{ color: accentColor }}>
                      {link.title ?? link.slug}
                    </p>
                    {showDescriptions && link.description && (
                      <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: mutedColor }}>
                        {link.description}
                      </p>
                    )}
                    {showDestination && (
                      <p className="text-[10px] mt-1 truncate" style={{ color: mutedColor, opacity: 0.6 }}>
                        {link.destination_url}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={layout === "compact" ? "space-y-1.5" : "space-y-3"}>
              {links.map((link) => (
                <li key={link.id}>
                  <a
                    href={`${origin}/${link.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block p-3 hover:opacity-80 transition-opacity ${layout === "compact" ? "p-2" : ""}`}
                    style={cardStyles()}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: accentColor }}>
                          {link.title ?? link.slug}
                        </p>
                        {showDescriptions && link.description && (
                          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: mutedColor }}>
                            {link.description}
                          </p>
                        )}
                        {showDestination && (
                          <p className="text-[10px] mt-1 truncate" style={{ color: mutedColor, opacity: 0.6 }}>
                            {link.destination_url}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: mutedColor }} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-[10px]" style={{ color: mutedColor }}>
          powered by <a href="/" className="underline" style={{ color: accentColor }}>QLSS.eu</a>
        </p>
      </div>
    </main>
  );
}

/**
 * Server-rendered SVG social icons (no client component needed for these).
 * Duplicated from social-icons.tsx to avoid "use client" in a server component.
 */
function SocialIconSvg({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const className = "w-full h-full";

  if (p === "github") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
  if (p === "twitter" || p === "x") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
  if (p === "instagram") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
  if (p === "linkedin") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
  if (p === "youtube") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
  if (p === "twitch") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
  if (p === "discord") return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
  if (p === "website") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
  if (p === "email") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
    </svg>
  );
  return <ExternalLink className={className} />;
}
