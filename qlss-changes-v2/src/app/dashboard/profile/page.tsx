"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Palette,
  Type,
  AlignJustify,
  Grid3x3,
  Minimize2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  User,
  FileText,
  Plus,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

interface ProfileSettings {
  theme_color: string | null;
  display_name: string | null;
  bio: string | null;
  layout: string;
  show_clicks: boolean;
  social_links: Array<{ platform: string; url: string }>;
}

interface FolderInfo {
  id: string;
  name: string;
  profile_page: boolean;
}

interface PreviewLink {
  slug: string;
  title: string | null;
  description: string | null;
  destination_url: string;
}

const THEME_PRESETS = [
  { name: "default", color: null, label: "none" },
  { name: "red", color: "#ef4444", label: "red" },
  { name: "orange", color: "#f97316", label: "orange" },
  { name: "amber", color: "#f59e0b", label: "amber" },
  { name: "green", color: "#22c55e", label: "green" },
  { name: "teal", color: "#14b8a6", label: "teal" },
  { name: "cyan", color: "#06b6d4", label: "cyan" },
  { name: "blue", color: "#3b82f6", label: "blue" },
  { name: "indigo", color: "#6366f1", label: "indigo" },
  { name: "violet", color: "#8b5cf6", label: "violet" },
  { name: "pink", color: "#ec4899", label: "pink" },
  { name: "rose", color: "#f43f5e", label: "rose" },
];

const LAYOUTS = [
  { value: "list", label: "list", icon: AlignJustify },
  { value: "grid", label: "grid", icon: Grid3x3 },
  { value: "compact", label: "compact", icon: Minimize2 },
] as const;

export function ProfileCustomizer({ username }: { username: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [settings, setSettings] = useState<ProfileSettings>({
    theme_color: null,
    display_name: null,
    bio: null,
    layout: "list",
    show_clicks: false,
    social_links: [],
  });
  const [profileFolder, setProfileFolder] = useState<FolderInfo | null>(null);
  const [previewLinks, setPreviewLinks] = useState<PreviewLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("");

  // Social link editing state
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [addingSocial, setAddingSocial] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, foldersRes] = await Promise.all([
        fetch("/api/profile/settings"),
        supabase
          .from("folders")
          .select("id, name, profile_page")
          .eq("profile_page", true)
          .maybeSingle(),
      ]);

      if (settingsRes.ok) {
        const json = await settingsRes.json();
        const s = json.settings;
        setSettings({
          theme_color: s.theme_color ?? null,
          display_name: s.display_name ?? null,
          bio: s.bio ?? null,
          layout: s.layout ?? "list",
          show_clicks: s.show_clicks ?? false,
          social_links: Array.isArray(s.social_links) ? s.social_links : [],
        });
        setCustomColor(s.theme_color || "");
      }

      setProfileFolder(foldersRes.data as FolderInfo | null);

      // Fetch preview links from profile folder
      if (foldersRes.data?.id) {
        const { data: linksData } = await supabase
          .from("links")
          .select("slug, title, description, destination_url")
          .eq("folder_id", foldersRes.data.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setPreviewLinks((linksData ?? []) as PreviewLink[]);
      } else {
        setPreviewLinks([]);
      }
    } catch {
      setError("Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function saveSetting(key: string, value: unknown) {
    setSaving(key);
    setSaved(null);
    setError(null);
    try {
      const res = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Could not save.");
        return;
      }
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(null);
    }
  }

  // Instant local state update for live preview (saves to server on blur)
  function updateLocal(key: string, value: unknown) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleCustomColorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customColor.trim()) {
      updateLocal("theme_color", customColor.trim());
      saveSetting("theme_color", customColor.trim());
    }
  }

  function addSocialLink() {
    if (!newSocialPlatform.trim() || !newSocialUrl.trim()) return;
    const updated = [
      ...settings.social_links,
      { platform: newSocialPlatform.trim(), url: newSocialUrl.trim() },
    ];
    updateLocal("social_links", updated);
    saveSetting("social_links", updated);
    setNewSocialPlatform("");
    setNewSocialUrl("");
    setAddingSocial(false);
  }

  function removeSocialLink(index: number) {
    const updated = settings.social_links.filter((_, i) => i !== index);
    updateLocal("social_links", updated);
    saveSetting("social_links", updated);
  }

  if (loading) {
    return (
      <section className="px-6 py-10 md:py-12">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            loading settings...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-10 md:py-12 h-full">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-bold tracking-tight">Profile page</h1>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Customize your public page at{" "}
            <a
              href={`/@${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              @{username}
            </a>
          </p>
        </div>

        {error && (
          <div className="mb-6 border border-destructive/40 bg-card px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-destructive">! {error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Two-column layout: settings left, live preview right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT: Settings editor */}
          <div className="space-y-6">
            {/* Profile folder status */}
            <SectionBlock title="profile folder" icon={User}>
              <div className="border border-border bg-card">
                <div className="px-4 py-3 flex items-center justify-between">
                  {profileFolder ? (
                    <>
                      <div>
                        <p className="text-xs text-foreground">
                          active: &quot;{profileFolder.name}&quot;
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {previewLinks.length} link{previewLinks.length !== 1 ? "s" : ""} featured
                        </p>
                      </div>
                      <span className="text-xs text-green-600">ok</span>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-foreground">
                          no profile folder set
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          create a folder and toggle the user icon
                        </p>
                      </div>
                      <a
                        href="/dashboard/links"
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        go to links
                      </a>
                    </>
                  )}
                </div>
              </div>
            </SectionBlock>

            {/* Display name */}
            <SectionBlock title="display name" icon={Type}>
              <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-[11px] flex items-center">
                  name
                </span>
                <input
                  type="text"
                  value={settings.display_name ?? ""}
                  onChange={(e) =>
                    updateLocal("display_name", e.target.value || null)
                  }
                  onBlur={() => saveSetting("display_name", settings.display_name)}
                  placeholder="shown above your @username"
                  className="flex-1 bg-transparent border-0 outline-none py-2 text-xs placeholder:text-muted-foreground/60"
                  maxLength={50}
                  disabled={saving === "display_name"}
                  autoComplete="off"
                  spellCheck={false}
                />
                {saving === "display_name" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground m-auto mr-3" />
                ) : saved === "display_name" ? (
                  <Check className="h-3 w-3 text-green-600 m-auto mr-3" />
                ) : null}
              </div>
            </SectionBlock>

            {/* Bio */}
            <SectionBlock title="bio" icon={FileText}>
              <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
                <span className="pl-3 pr-2 text-muted-foreground select-none text-[11px] flex items-start pt-2">
                  bio
                </span>
                <textarea
                  value={settings.bio ?? ""}
                  onChange={(e) =>
                    updateLocal("bio", e.target.value || null)
                  }
                  onBlur={() => saveSetting("bio", settings.bio)}
                  placeholder="a short bio for your profile (max 300 chars)"
                  className="flex-1 bg-transparent border-0 outline-none py-2 text-xs placeholder:text-muted-foreground/60 resize-none"
                  rows={3}
                  maxLength={300}
                  disabled={saving === "bio"}
                  spellCheck={false}
                />
                {saving === "bio" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground m-auto mr-3" />
                ) : saved === "bio" ? (
                  <Check className="h-3 w-3 text-green-600 m-auto mr-3" />
                ) : null}
              </div>
              {settings.bio && (
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {settings.bio.length}/300
                </p>
              )}
            </SectionBlock>

            {/* Social links */}
            <SectionBlock title="social links" icon={LinkIcon}>
              <div className="border border-border bg-card space-y-2">
                {/* Existing social links */}
                {settings.social_links.length > 0 && (
                  <ul className="divide-y divide-border">
                    {settings.social_links.map((sl, i) => (
                      <li
                        key={i}
                        className="px-4 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground">{sl.platform}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {sl.url}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSocialLink(i)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add new social link */}
                {addingSocial ? (
                  <div className="px-4 py-3 border-t border-border space-y-2">
                    <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                      <span className="pl-2 pr-1 text-muted-foreground select-none text-[10px] flex items-center">
                        @
                      </span>
                      <input
                        type="text"
                        value={newSocialPlatform}
                        onChange={(e) => setNewSocialPlatform(e.target.value)}
                        placeholder="platform (e.g. github)"
                        className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60"
                        maxLength={30}
                        autoFocus
                        spellCheck={false}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSocialLink();
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
                      <span className="pl-2 pr-1 text-muted-foreground select-none text-[10px] flex items-center">
                        url
                      </span>
                      <input
                        type="url"
                        value={newSocialUrl}
                        onChange={(e) => setNewSocialUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60"
                        spellCheck={false}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSocialLink();
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingSocial(false);
                          setNewSocialPlatform("");
                          setNewSocialUrl("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      >
                        cancel
                      </button>
                      <button
                        type="button"
                        onClick={addSocialLink}
                        disabled={
                          !newSocialPlatform.trim() || !newSocialUrl.trim()
                        }
                        className="inline-flex items-center gap-1 text-xs text-foreground px-2 py-1 border border-border hover:bg-accent disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        add
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setAddingSocial(true)}
                      disabled={settings.social_links.length >= 10}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      <Plus className="h-3 w-3" />
                      add link
                    </button>
                  </div>
                )}
              </div>
            </SectionBlock>

            {/* Theme color */}
            <SectionBlock title="theme color" icon={Palette}>
              <div className="border border-border bg-card px-4 py-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {THEME_PRESETS.map((preset) => {
                    const isActive = settings.theme_color === preset.color;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          updateLocal("theme_color", preset.color);
                          saveSetting("theme_color", preset.color);
                        }}
                        disabled={saving === "theme_color"}
                        className={`w-7 h-7 border-2 transition-colors flex items-center justify-center ${
                          isActive
                            ? "border-foreground"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        style={
                          preset.color
                            ? { backgroundColor: preset.color }
                            : undefined
                        }
                        title={preset.label}
                      >
                        {!preset.color && (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <form
                  onSubmit={handleCustomColorSubmit}
                  className="flex items-stretch border border-border bg-background focus-within:border-foreground transition-colors"
                >
                  <span className="pl-3 pr-2 text-muted-foreground select-none text-[11px] flex items-center">
                    hex
                  </span>
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#ff6600 (optional)"
                    className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs placeholder:text-muted-foreground/60"
                    maxLength={8}
                    disabled={saving === "theme_color"}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    disabled={
                      saving === "theme_color" ||
                      !customColor.trim() ||
                      !/^#[0-9a-fA-F]{3,8}$/.test(customColor.trim())
                    }
                    className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {saving === "theme_color" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                </form>
                {settings.theme_color && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 border border-border"
                        style={{ backgroundColor: settings.theme_color }}
                      />
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {settings.theme_color}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateLocal("theme_color", null);
                        saveSetting("theme_color", null);
                        setCustomColor("");
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      reset
                    </button>
                  </div>
                )}
              </div>
            </SectionBlock>

            {/* Layout */}
            <SectionBlock title="link layout" icon={AlignJustify}>
              <div className="flex gap-2">
                {LAYOUTS.map((layout) => {
                  const isActive = settings.layout === layout.value;
                  return (
                    <button
                      key={layout.value}
                      type="button"
                      onClick={() => {
                        updateLocal("layout", layout.value);
                        saveSetting("layout", layout.value);
                      }}
                      disabled={saving === "layout"}
                      className={`flex items-center gap-1.5 px-3 py-2 border text-xs transition-colors ${
                        isActive
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <layout.icon className="h-3 w-3" />
                      {layout.label}
                    </button>
                  );
                })}
              </div>
            </SectionBlock>

            {/* Show clicks toggle */}
            <SectionBlock title="options" icon={Eye}>
              <div className="flex items-center justify-between border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-xs text-foreground">show click counts</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    display click count on each link
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateLocal("show_clicks", !settings.show_clicks);
                    saveSetting("show_clicks", !settings.show_clicks);
                  }}
                  disabled={saving === "show_clicks"}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 border transition-colors ${
                    settings.show_clicks
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {settings.show_clicks ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  {settings.show_clicks ? "on" : "off"}
                </button>
              </div>
            </SectionBlock>
          </div>

          {/* RIGHT: Live preview */}
          <div className="md:sticky md:top-6 md:self-start">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">
                live preview
              </h2>
            </div>
            <div className="border border-border bg-card overflow-hidden">
              {/* Preview header */}
              <div className="px-4 pt-5 pb-4 border-b border-border text-center">
                {settings.display_name && (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    {settings.display_name}
                  </p>
                )}
                <p
                  className="text-xl font-bold tracking-tight"
                  style={
                    settings.theme_color
                      ? { color: settings.theme_color }
                      : undefined
                  }
                >
                  @{username}
                </p>
                {settings.bio ? (
                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {settings.bio}
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-muted-foreground/60 italic">
                    no bio
                  </p>
                )}

                {/* Social links preview */}
                {settings.social_links.length > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {settings.social_links.map((sl, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5"
                      >
                        {sl.platform}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview links */}
              <div className="px-4 py-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    links
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {previewLinks.length}
                  </span>
                </div>

                {previewLinks.length === 0 ? (
                  <p className="py-8 text-center text-[11px] text-muted-foreground">
                    {profileFolder ? "no links in folder" : "no profile folder"}
                  </p>
                ) : settings.layout === "grid" ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {previewLinks.slice(0, 6).map((link) => (
                      <div
                        key={link.slug}
                        className="border border-border p-2"
                        style={
                          settings.theme_color
                            ? { borderLeftColor: settings.theme_color }
                            : undefined
                        }
                      >
                        <p className="text-[10px] font-medium truncate">
                          {link.title ?? link.slug}
                        </p>
                        {link.description && (
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                            {link.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : settings.layout === "compact" ? (
                  <div className="space-y-0.5">
                    {previewLinks.slice(0, 8).map((link) => (
                      <div
                        key={link.slug}
                        className="py-1 px-1.5 text-[10px] hover:bg-accent/20"
                      >
                        <span className="font-medium">
                          {link.title ?? link.slug}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {previewLinks.slice(0, 5).map((link) => (
                      <div
                        key={link.slug}
                        className="border border-border p-2.5"
                        style={
                          settings.theme_color
                            ? { borderLeftColor: settings.theme_color }
                            : undefined
                        }
                      >
                        <p className="text-[11px] font-medium">
                          {link.title ?? link.slug}
                        </p>
                        {link.description && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                            {link.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {previewLinks.length === 0 && profileFolder && (
                  <p className="text-center text-[10px] text-muted-foreground mt-2">
                    add links to your &quot;{profileFolder.name}&quot; folder
                  </p>
                )}
              </div>
            </div>

            {/* Open in new tab */}
            <a
              href={`/@${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              open full page
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
