import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { normalizeUsername, isReservedUsername } from "@/lib/username";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
 *
 * Supports customization via profile settings:
 *   - theme_color, bg_color, layout, link_style, font_style
 *   - show_descriptions, show_destination
 *   - display_name, social_links
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

  // Look up the profile by username (case-insensitive).
  const { data: profileRow } = await serviceClient
    .from("profiles")
    .select("id, username, description, created_at, settings")
    .ilike("username", username)
    .maybeSingle();

  const profile = profileRow as ProfileRow | null;
  if (!profile) notFound();

  // Parse settings (fallback to defaults)
  const s = profile.settings ?? {};
  const themeColor = (s.theme_color as string) || "";
  const bgColor = (s.bg_color as string) || "";
  const layout = (s.layout as string) || "list";
  const linkStyle = (s.link_style as string) || "bordered";
  const fontStyle = (s.font_style as string) || "mono";
  const showDescriptions = s.show_descriptions !== false;
  const showDestination = s.show_destination !== false;
  const displayName = (s.display_name as string) || "";
  const socialLinks = (s.social_links as SocialLink[]) || [];

  const isDark = [
    "#0f172a", "#1e293b", "#334155", "#1e1b4b",
  ].includes(bgColor);

  const fgColor = isDark ? "#e2e8f0" : themeColor || "#0c0c0a";
  const mutedColor = isDark ? "#94a3b8" : "#6a6a64";
  const borderColor = isDark ? "#334155" : "#d9d8d0";
  const cardColor = isDark ? "#1e293b" : "#ffffff";

  // Find the user's profile page folder.
  const { data: profileFolder } = await serviceClient
    .from("folders")
    .select("id")
    .eq("user_id", profile.id)
    .eq("profile_page", true)
    .maybeSingle();

  // Fetch links from the profile page folder only.
  let links: LinkRow[] = [];
  if (profileFolder) {
    const { data: linksData } = await serviceClient
      .from("links")
      .select("id, slug, destination_url, title, description, created_at")
      .eq("user_id", profile.id)
      .eq("folder_id", profileFolder.id)
      .order("created_at", { ascending: false });
    links = (linksData ?? []) as LinkRow[];
  }

  const origin = siteOrigin();

  // Build dynamic styles
  const dynamicStyles: Record<string, string> = {};
  if (bgColor) dynamicStyles.backgroundColor = bgColor;
  if (themeColor) dynamicStyles.color = fgColor;

  const fontFamily =
    fontStyle === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : fontStyle === "sans"
        ? "system-ui, -apple-system, sans-serif"
        : "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: bgColor || undefined,
        fontFamily,
      }}
    >
      {/* Subtle top bar with back link */}
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

      {/* Profile header */}
      <header
        className="px-6 pt-8 pb-12"
        style={{
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          {/* Display name or @username */}
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: fgColor }}
          >
            {displayName ? displayName : `@${profile.username}`}
          </h1>
          {!displayName && (
            <p
              className="mt-1 text-xs"
              style={{ color: mutedColor }}
            >
              @{profile.username}
            </p>
          )}

          {/* Bio */}
          {profile.description ? (
            <p
              className="mt-4 text-sm leading-relaxed max-w-md mx-auto"
              style={{ color: mutedColor }}
            >
              {profile.description}
            </p>
          ) : null}

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              {socialLinks.map((sl, i) => (
                <a
                  key={i}
                  href={sl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition-opacity hover:opacity-70 inline-flex items-center gap-1"
                  style={{ color: themeColor || fgColor }}
                >
                  <ExternalLink className="h-3 w-3" />
                  {sl.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Links list */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-baseline justify-between mb-6">
            <h2
              className="text-[10px] uppercase tracking-widest"
              style={{ color: mutedColor }}
            >
              links
            </h2>
            {links.length > 0 && (
              <span className="text-xs" style={{ color: mutedColor }}>
                {links.length} total
              </span>
            )}
          </div>

          {links.length === 0 ? (
            <p
              className="py-16 text-center text-sm"
              style={{ color: mutedColor }}
            >
              {profileFolder
                ? "No links yet."
                : "No links — the user hasn't set up their profile page yet."}
            </p>
          ) : layout === "grid" ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {links.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  origin={origin}
                  themeColor={themeColor}
                  fgColor={fgColor}
                  mutedColor={mutedColor}
                  borderColor={borderColor}
                  cardColor={cardColor}
                  isDark={isDark}
                  showDescriptions={showDescriptions}
                  showDestination={showDestination}
                  linkStyle={linkStyle}
                />
              ))}
            </ul>
          ) : (
            <ul
              className={
                layout === "compact" ? "space-y-1.5" : "space-y-3"
              }
            >
              {links.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  origin={origin}
                  themeColor={themeColor}
                  fgColor={fgColor}
                  mutedColor={mutedColor}
                  borderColor={borderColor}
                  cardColor={cardColor}
                  isDark={isDark}
                  showDescriptions={showDescriptions}
                  showDestination={showDestination}
                  linkStyle={linkStyle}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Link card component
// ---------------------------------------------------------------------------

function LinkCard({
  link,
  origin,
  themeColor,
  fgColor,
  mutedColor,
  borderColor,
  cardColor,
  isDark,
  showDescriptions,
  showDestination,
  linkStyle,
}: {
  link: LinkRow;
  origin: string;
  themeColor: string;
  fgColor: string;
  mutedColor: string;
  borderColor: string;
  cardColor: string;
  isDark: boolean;
  showDescriptions: boolean;
  showDestination: boolean;
  linkStyle: string;
}) {
  const shortUrl = `${origin}/${link.slug}`;
  const displayTitle = link.title ?? link.slug;

  // Different card styles
  let cardStyles: React.CSSProperties = {};
  if (linkStyle === "bordered") {
    cardStyles = {
      border: `1px solid ${borderColor}`,
      backgroundColor: cardColor,
    };
  } else if (linkStyle === "filled") {
    cardStyles = {
      backgroundColor: themeColor
        ? `${themeColor}15`
        : isDark
          ? "#0f172a"
          : "#f5f5f0",
    };
  } else {
    // minimal
    cardStyles = {};
  }

  return (
    <li
      className="p-3 hover:opacity-80 transition-all"
      style={cardStyles}
    >
      <a
        href={shortUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-medium group-hover:underline"
              style={{ color: fgColor }}
            >
              {displayTitle}
            </h3>
            {showDescriptions && link.description && (
              <p
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: mutedColor }}
              >
                {link.description}
              </p>
            )}
            {showDestination && (
              <p
                className="mt-1 text-[11px] truncate"
                style={{ color: mutedColor, opacity: 0.7 }}
              >
                {link.destination_url}
              </p>
            )}
          </div>
          <ExternalLink
            className="h-3.5 w-3.5 shrink-0 mt-0.5"
            style={{ color: mutedColor }}
          />
        </div>
      </a>
    </li>
  );
}
