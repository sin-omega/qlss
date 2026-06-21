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

  const isDark = [
    "#0f172a", "#1e293b", "#334155", "#1e1b4b",
  ].includes(bgColor);

  const accentColor = themeColor || (isDark ? "#60a5fa" : "#0c0c0a");
  const fgColor = isDark ? "#e2e8f0" : "#0c0c0a";
  const mutedColor = isDark ? "#94a3b8" : "#6a6a64";
  const borderColor = isDark ? "#334155" : "#d9d8d0";
  const cardColor = isDark ? "#1e293b" : "#ffffff";

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
    if (linkStyle === "bordered") {
      return { border: `1px solid ${borderColor}`, backgroundColor: cardColor };
    }
    if (linkStyle === "filled") {
      return {
        backgroundColor: themeColor
          ? `${themeColor}15`
          : isDark ? "#0f172a" : "#f5f5f0",
      };
    }
    return {};
  }

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: bgColor || undefined,
        fontFamily,
      }}
    >
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

      {/* Profile header */}
      <header className="px-6 pb-8" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: accentColor }}>
            {displayName || `@${profile.username}`}
          </h1>
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
          {socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
              {socialLinks.map((sl, i) => (
                <a
                  key={i}
                  href={sl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition-opacity hover:opacity-70 inline-flex items-center gap-1"
                  style={{ color: accentColor }}
                >
                  <ExternalLink className="h-3 w-3" />
                  {sl.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

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
    </main>
  );
}
