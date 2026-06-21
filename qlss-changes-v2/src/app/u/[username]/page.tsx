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
}

interface ProfileSettingsRow {
  theme_color: string | null;
  display_name: string | null;
  bio: string | null;
  layout: string;
  show_clicks: boolean;
  social_links: Array<{ platform: string; url: string }> | null;
}

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

/**
 * Public user profile page at /@username (rewritten from /u/[username]).
 *
 * Shows:
 *   - Display name (from profile_settings, falls back to nothing)
 *   - @username (large)
 *   - Bio (from profile_settings.bio, falls back to profiles.description)
 *   - Social links (from profile_settings.social_links)
 *   - ONLY links from the user's "profile page" folder
 *   - If no profile page folder exists, shows "No links yet."
 *
 * Supports theme color from profile_settings.
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
    .select("id, username, description, created_at")
    .ilike("username", username)
    .maybeSingle();

  const profile = profileRow as ProfileRow | null;
  if (!profile) notFound();

  // Look up profile_settings for customization options
  let ps: ProfileSettingsRow = {
    theme_color: null,
    display_name: null,
    bio: null,
    layout: "list",
    show_clicks: false,
    social_links: null,
  };
  try {
    const { data: settingsData } = await serviceClient
      .from("profile_settings")
      .select("theme_color, display_name, bio, layout, show_clicks, social_links")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (settingsData) {
      ps = settingsData as ProfileSettingsRow;
    }
  } catch {
    // profile_settings table might not exist yet
  }

  // Look for a profile page folder
  let profileFolderId: string | null = null;
  try {
    const { data: profileFolder } = await serviceClient
      .from("folders")
      .select("id")
      .eq("user_id", profile.id)
      .eq("profile_page", true)
      .maybeSingle();
    profileFolderId = profileFolder?.id ?? null;
  } catch {
    // folders table or profile_page column might not exist — fall back to all links
  }

  // Fetch links from the profile page folder
  let links: LinkRow[] = [];
  if (profileFolderId) {
    const { data: linksData } = await serviceClient
      .from("links")
      .select("id, slug, destination_url, title, description, created_at")
      .eq("user_id", profile.id)
      .eq("folder_id", profileFolderId)
      .order("created_at", { ascending: false });
    links = (linksData ?? []) as LinkRow[];
  } else {
    // No profile folder — show nothing
    links = [];
  }

  const origin = siteOrigin();
  const themeColor = ps.theme_color;
  const displayName = ps.display_name;
  const bio = ps.bio || profile.description || null;
  const socialLinks = ps.social_links || [];

  return (
    <main className="min-h-screen bg-background">
      {/* Subtle top bar with back link */}
      <div className="px-6 py-5">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3" />
          qlss
        </Link>
      </div>

      {/* Profile header — centered, large */}
      <header className="px-6 pt-8 pb-12 border-b border-border">
        <div className="mx-auto max-w-2xl text-center">
          {displayName && (
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {displayName}
            </p>
          )}
          <h1
            className="text-3xl font-bold tracking-tight"
            style={themeColor ? { color: themeColor } : undefined}
          >
            @{profile.username}
          </h1>
          {bio ? (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              {bio}
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground/60 italic">
              no bio
            </p>
          )}

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              {socialLinks.map((sl, i) => (
                <a
                  key={i}
                  href={sl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-2.5 py-1 hover:border-foreground/40"
                >
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
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">
              links
            </h2>
            {links.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {links.length} total
              </span>
            )}
          </div>

          {links.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No links yet.
            </p>
          ) : ps.layout === "grid" ? (
            <div className="grid grid-cols-2 gap-3">
              {links.map((link) => {
                const shortUrl = `${origin}/${link.slug}`;
                const displayTitle = link.title ?? link.slug;
                return (
                  <a
                    key={link.id}
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-border bg-card p-3 hover:border-foreground/40 transition-colors group"
                  >
                    <h3 className="text-xs font-medium group-hover:underline truncate">
                      {displayTitle}
                    </h3>
                    {link.description && (
                      <p className="mt-1 text-[11px] text-muted-foreground truncate">
                        {link.description}
                      </p>
                    )}
                  </a>
                );
              })}
            </div>
          ) : ps.layout === "compact" ? (
            <ul className="space-y-1">
              {links.map((link) => {
                const shortUrl = `${origin}/${link.slug}`;
                const displayTitle = link.title ?? link.slug;
                return (
                  <li key={link.id}>
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-1.5 px-2 text-xs hover:bg-accent/30 transition-colors group"
                    >
                      <span className="group-hover:underline">{displayTitle}</span>
                      {link.description && (
                        <span className="text-muted-foreground ml-2 truncate">
                          {link.description}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-4">
              {links.map((link) => {
                const shortUrl = `${origin}/${link.slug}`;
                const displayTitle = link.title ?? link.slug;
                return (
                  <li
                    key={link.id}
                    className="border border-border bg-card p-4 hover:border-foreground/40 transition-colors"
                    style={
                      themeColor
                        ? { borderLeftColor: themeColor }
                        : undefined
                    }
                  >
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium group-hover:underline">
                            {displayTitle}
                          </h3>
                          {link.description && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              {link.description}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-muted-foreground/70 truncate">
                            -&gt; {link.destination_url}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
