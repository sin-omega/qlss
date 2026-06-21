"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Palette,
  Layout,
  Type,
  ToggleLeft,
  ToggleRight,
  X,
  Plus,
  Eye,
  ExternalLink,
  FolderPlus,
  Trash2,
  SmilePlus,
  Image,
  MousePointerClick,
  Zap,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { SocialIcon, validateSocialUrl } from "@/components/qlss/social-icons";

interface SocialLink {
  platform: string;
  url: string;
}

interface Settings {
  theme_color?: string;
  bg_color?: string;
  layout?: "list" | "grid" | "compact";
  show_descriptions?: boolean;
  show_destination?: boolean;
  display_name?: string;
  bio?: string;
  link_style?: "bordered" | "minimal" | "filled";
  font_style?: "mono" | "sans" | "serif";
  social_links?: SocialLink[];
  avatar_emoji?: string;
  banner_url?: string;
  border_radius?: "sharp" | "rounded" | "pill";
  cta_text?: string;
  cta_url?: string;
  status_text?: string;
}

const THEME_COLORS = [
  { label: "Default", value: "" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Slate", value: "#64748b" },
];

const BG_COLORS = [
  { label: "Default", value: "" },
  { label: "White", value: "#ffffff" },
  { label: "Warm", value: "#fefce8" },
  { label: "Cream", value: "#fef3c7" },
  { label: "Mint", value: "#ecfdf5" },
  { label: "Sky tint", value: "#f0f9ff" },
  { label: "Lavender", value: "#f5f3ff" },
  { label: "Rose tint", value: "#fff1f2" },
  { label: "Dark", value: "#0f172a" },
  { label: "Charcoal", value: "#1e293b" },
  { label: "Slate dark", value: "#334155" },
  { label: "Midnight", value: "#1e1b4b" },
];

const SOCIAL_PLATFORMS = [
  "github", "twitter", "instagram", "linkedin",
  "youtube", "twitch", "discord", "website", "email", "custom",
];

const BORDER_RADIUS_OPTIONS = [
  { label: "Sharp", value: "sharp" },
  { label: "Rounded", value: "rounded" },
  { label: "Pill", value: "pill" },
];

/**
 * Profile page customizer with live preview — carrd.co style.
 */
export function ProfileCustomizer({
  initialSettings,
  username,
  hasProfileFolder = true,
  profileFolderName = "profile page",
}: {
  initialSettings: Record<string, unknown>;
  username: string;
  hasProfileFolder?: boolean;
  profileFolderName?: string;
}) {
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>(
    initialSettings as Settings,
  );
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    (initialSettings.social_links as SocialLink[]) ?? [],
  );
  const [newPlatform, setNewPlatform] = useState("github");
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(initialSettings as Settings);
    setSocialLinks(
      (initialSettings.social_links as SocialLink[]) ?? [],
    );
  }, [initialSettings]);

  const update = useCallback((key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const payload = {
        ...settings,
        social_links: socialLinks,
      };

      const res = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Could not save.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProfileFolder() {
    setCreatingFolder(true);
    setFolderError(null);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileFolderName, profile_page: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFolderError(json?.error ?? "Could not create profile folder.");
        return;
      }
      router.refresh();
    } catch {
      setFolderError("Network error.");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleRemoveProfileFolder() {
    if (!confirm("Delete your profile page? This removes the folder and all its links.")) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      // Find the folder first
      const listRes = await fetch("/api/folders");
      const listJson = await listRes.json();
      const folder = listJson.folders?.find((f: { profile_page?: boolean }) => f.profile_page);
      if (!folder) { setRemoving(false); return; }

      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setRemoveError(json?.error ?? "Could not remove profile page.");
        return;
      }
      router.refresh();
    } catch {
      setRemoveError("Network error.");
    } finally {
      setRemoving(false);
    }
  }

  function addSocialLink() {
    if (!newUrl.trim() || socialLinks.length >= 10) return;

    const urlErr = validateSocialUrl(newPlatform, newUrl.trim());
    if (urlErr) {
      setError(urlErr);
      return;
    }

    setSocialLinks((prev) => [
      ...prev,
      { platform: newPlatform, url: newUrl.trim() },
    ]);
    setNewUrl("");
    setError(null);
    setSaved(false);
  }

  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  // ---- Derived preview styles ----
  const isDark = settings.bg_color
    ? ["#0f172a", "#1e293b", "#334155", "#1e1b4b"].includes(settings.bg_color)
    : false;

  const accentColor = settings.theme_color || (isDark ? "#60a5fa" : "#0c0c0a");
  const fgColor = isDark ? "#e2e8f0" : "#0c0c0a";
  const mutedColor = isDark ? "#94a3b8" : "#6a6a64";
  const borderColor = isDark ? "#334155" : "#d9d8d0";
  const cardColor = isDark ? "#1e293b" : "#ffffff";

  const borderRadiusPx =
    settings.border_radius === "pill" ? 999 : settings.border_radius === "rounded" ? 8 : 0;

  const fontFamily =
    settings.font_style === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : settings.font_style === "sans"
        ? "system-ui, -apple-system, sans-serif"
        : "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  const sampleLinks = [
    { slug: "example", title: "My Portfolio", description: "Check out my work" },
    { slug: "blog", title: "Blog", description: "Thoughts and tutorials" },
    { slug: "repo", title: "GitHub Repo", description: "Open source projects" },
  ];

  // ---- No profile folder yet? Show create button ----
  if (!hasProfileFolder) {
    return (
      <div className="border border-border bg-card">
        <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
          profile page
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            You don&apos;t have a profile page yet. Create one to customize it with
            a theme, bio, social links, and featured links.
          </p>
          <button
            type="button"
            onClick={handleCreateProfileFolder}
            disabled={creatingFolder}
            className="text-xs bg-foreground text-background hover:bg-foreground/90 px-4 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {creatingFolder ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FolderPlus className="h-3 w-3" />
            )}
            create profile page
          </button>
          {folderError && (
            <p className="mt-2 text-xs text-destructive">! {folderError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="flex gap-6 items-start">
        {/* ─── Left: Settings Editor ─── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Remove Profile Page */}
          <Section icon={<Trash2 className="h-3.5 w-3.5" />} title="danger zone">
            <button
              type="button"
              onClick={handleRemoveProfileFolder}
              disabled={removing}
              className="text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 px-3 py-1.5 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              remove profile page
            </button>
            {removeError && <p className="mt-2 text-xs text-destructive">! {removeError}</p>}
          </Section>

          {/* Avatar Emoji */}
          <Section icon={<SmilePlus className="h-3.5 w-3.5" />} title="avatar emoji">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 flex items-center justify-center text-2xl border border-border"
                style={{ borderRadius: borderRadiusPx, backgroundColor: cardColor }}
              >
                {settings.avatar_emoji || "?"}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={settings.avatar_emoji ?? ""}
                  onChange={(e) => update("avatar_emoji", e.target.value.slice(0, 2))}
                  placeholder="e.g. 😎"
                  className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground"
                  maxLength={2}
                />
                <p className="text-[10px] text-muted-foreground mt-1">1-2 emoji characters</p>
              </div>
              {settings.avatar_emoji && (
                <button type="button" onClick={() => update("avatar_emoji", "")} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
              )}
            </div>
          </Section>

          {/* Display Name */}
          <Section icon={<Type className="h-3.5 w-3.5" />} title="display name">
            <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
              <input
                type="text"
                value={settings.display_name ?? ""}
                onChange={(e) => update("display_name", e.target.value)}
                placeholder="shown instead of @username"
                className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs placeholder:text-muted-foreground/60"
                maxLength={32}
              />
              {settings.display_name && (
                <button type="button" onClick={() => update("display_name", "")} className="px-2 text-xs text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </Section>

          {/* Status */}
          <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="status">
            <input
              type="text"
              value={settings.status_text ?? ""}
              onChange={(e) => update("status_text", e.target.value)}
              placeholder="e.g. available for work"
              className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground"
              maxLength={60}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              shown below your name, like a Discord status
            </p>
          </Section>

          {/* Bio */}
          <Section icon={<Type className="h-3.5 w-3.5" />} title="bio">
            <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
              <textarea
                value={settings.bio ?? ""}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="a short bio for your profile"
                className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs placeholder:text-muted-foreground/60 resize-none"
                rows={2}
                maxLength={160}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {(settings.bio ?? "").length}/160
            </p>
          </Section>

          {/* Banner Image */}
          <Section icon={<Image className="h-3.5 w-3.5" />} title="banner image">
            <input
              type="text"
              value={settings.banner_url ?? ""}
              onChange={(e) => update("banner_url", e.target.value)}
              placeholder="https://example.com/banner.png"
              className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              optional image URL shown as a header banner
            </p>
          </Section>

          {/* CTA Button */}
          <Section icon={<Zap className="h-3.5 w-3.5" />} title="cta button">
            <div className="space-y-2">
              <input
                type="text"
                value={settings.cta_text ?? ""}
                onChange={(e) => update("cta_text", e.target.value)}
                placeholder="button text, e.g. Hire me"
                className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground"
                maxLength={40}
              />
              <input
                type="text"
                value={settings.cta_url ?? ""}
                onChange={(e) => update("cta_url", e.target.value)}
                placeholder="https://example.com/contact"
                className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              a prominent button shown above your links
            </p>
          </Section>

          {/* Theme Color */}
          <Section icon={<Palette className="h-3.5 w-3.5" />} title="theme color">
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update("theme_color", c.value)}
                  className={`w-7 h-7 border-2 transition-all ${
                    settings.theme_color === c.value
                      ? "border-foreground scale-110"
                      : "border-border hover:border-foreground/50"
                  }`}
                  style={{ backgroundColor: c.value || "var(--foreground)" }}
                  title={c.label}
                />
              ))}
            </div>
            <input
              type="text"
              value={settings.theme_color ?? ""}
              onChange={(e) => update("theme_color", e.target.value)}
              className="mt-2 text-xs bg-transparent border border-border px-2 py-1 outline-none focus:border-foreground w-24"
              placeholder="custom hex"
            />
          </Section>

          {/* Background */}
          <Section icon={<Palette className="h-3.5 w-3.5" />} title="background">
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update("bg_color", c.value)}
                  className={`w-7 h-7 border-2 transition-all ${
                    settings.bg_color === c.value
                      ? "border-foreground scale-110"
                      : "border-border hover:border-foreground/50"
                  }`}
                  style={{ backgroundColor: c.value || "var(--background)" }}
                  title={c.label}
                />
              ))}
            </div>
            <input
              type="text"
              value={settings.bg_color ?? ""}
              onChange={(e) => update("bg_color", e.target.value)}
              className="mt-2 text-xs bg-transparent border border-border px-2 py-1 outline-none focus:border-foreground w-24"
              placeholder="custom hex"
            />
          </Section>

          {/* Border Radius */}
          <Section icon={<MousePointerClick className="h-3.5 w-3.5" />} title="border radius">
            <div className="flex gap-2">
              {BORDER_RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("border_radius", opt.value)}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    settings.border_radius === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Layout */}
          <Section icon={<Layout className="h-3.5 w-3.5" />} title="layout">
            <div className="flex gap-2">
              {(["list", "grid", "compact"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("layout", opt)}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    settings.layout === opt
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Section>

          {/* Link Style */}
          <Section icon={<ExternalLink className="h-3.5 w-3.5" />} title="link style">
            <div className="flex gap-2">
              {(["bordered", "minimal", "filled"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("link_style", opt)}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    settings.link_style === opt
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Section>

          {/* Font */}
          <Section icon={<Type className="h-3.5 w-3.5" />} title="font">
            <div className="flex gap-2">
              {(["mono", "sans", "serif"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("font_style", opt)}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    settings.font_style === opt
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Section>

          {/* Toggles */}
          <Section icon={<ToggleLeft className="h-3.5 w-3.5" />} title="options">
            <div className="space-y-2">
              <ToggleRow label="Show descriptions" checked={settings.show_descriptions !== false} onChange={(v) => update("show_descriptions", v)} />
              <ToggleRow label="Show destination URLs" checked={settings.show_destination !== false} onChange={(v) => update("show_destination", v)} />
            </div>
          </Section>

          {/* Social Links */}
          <Section icon={<ExternalLink className="h-3.5 w-3.5" />} title="social links">
            <div className="space-y-2">
              {socialLinks.map((sl, i) => (
                <div key={i} className="flex items-center gap-2 border border-border bg-card px-2 py-1.5">
                  <div className="w-5 h-5 shrink-0" style={{ color: mutedColor }}>
                    <SocialIcon platform={sl.platform} className="w-full h-full" />
                  </div>
                  <span className="text-xs text-foreground truncate flex-1 min-w-0">{sl.platform}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{sl.url}</span>
                  <button type="button" onClick={() => removeSocialLink(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {socialLinks.length < 10 && (
                <div className="flex items-center gap-2">
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="text-xs bg-background border border-border px-2 py-1 outline-none"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder={newPlatform === "email" ? "mailto:you@example.com" : "https://..."}
                    className="flex-1 text-xs bg-background border border-border px-2 py-1 outline-none focus:border-foreground"
                  />
                  <button type="button" onClick={addSocialLink} disabled={!newUrl.trim()} className="text-foreground hover:opacity-70 disabled:opacity-30">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Save */}
          <div className="flex items-center justify-between pt-2">
            <a href={`/@${username}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
              <Eye className="h-3 w-3" /> view live
            </a>
            <div className="flex items-center gap-3">
              {error && <p className="text-xs text-destructive">! {error}</p>}
              <button type="submit" disabled={busy} className="text-xs bg-foreground text-background hover:bg-foreground/90 px-4 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50">
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : saved ? (
                  <><Check className="h-3 w-3" /> saved</>
                ) : (
                  <><Check className="h-3 w-3" /> save</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Right: Live Preview ─── */}
        <div className="hidden lg:block w-80 shrink-0 sticky top-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">live preview</div>
          <div className="border border-border overflow-hidden" style={{ fontFamily, backgroundColor: settings.bg_color || undefined }}>
            <div className="min-h-[400px]" style={{ backgroundColor: settings.bg_color || undefined }}>
              {/* Banner */}
              {settings.banner_url && (
                <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${settings.banner_url})` }} />
              )}

              <div className="p-4">
                {/* Header */}
                <div className="text-center pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <p className="text-[10px]" style={{ color: mutedColor }}>QLSS.eu</p>

                  {/* Avatar */}
                  {settings.avatar_emoji && (
                    <div className="text-3xl mt-2">{settings.avatar_emoji}</div>
                  )}

                  <h2 className="text-xl font-bold mt-2" style={{ color: accentColor }}>
                    {settings.display_name || `@${username}`}
                  </h2>

                  {/* Status */}
                  {settings.status_text && (
                    <p className="text-[10px] mt-1" style={{ color: accentColor }}>
                      {settings.status_text}
                    </p>
                  )}

                  {!settings.display_name && (
                    <p className="text-[10px] mt-0.5" style={{ color: mutedColor }}>
                      @{username}
                    </p>
                  )}
                  {settings.bio && (
                    <p className="text-[11px] mt-2 leading-relaxed max-w-[200px] mx-auto" style={{ color: mutedColor }}>
                      {settings.bio}
                    </p>
                  )}

                  {/* Social links with icons */}
                  {socialLinks.length > 0 && (
                    <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                      {socialLinks.map((sl, i) => (
                        <a key={i} href={sl.url} target="_blank" rel="noopener noreferrer"
                          className="w-6 h-6 transition-opacity hover:opacity-70"
                          title={sl.platform}
                          style={{ color: accentColor }}
                        >
                          <SocialIcon platform={sl.platform} className="w-full h-full" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                {settings.cta_text && (
                  <div className="mt-4">
                    <a
                      href={settings.cta_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-xs font-medium py-2 px-4 transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: accentColor,
                        color: isDark ? "#0c0c0a" : "#fbfbf9",
                        borderRadius: borderRadiusPx,
                      }}
                    >
                      {settings.cta_text}
                    </a>
                  </div>
                )}

                {/* Links */}
                <div className="mt-4">
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: mutedColor }}>links</p>
                  {settings.layout === "grid" ? (
                    <div className="grid grid-cols-2 gap-2">
                      {sampleLinks.map((l) => (
                        <div key={l.slug} className="p-2 transition-opacity"
                          style={previewCardStyle(settings.link_style, accentColor, isDark, borderColor, cardColor, borderRadiusPx)}>
                          <p className="text-xs font-medium" style={{ color: accentColor }}>{l.title}</p>
                          {settings.show_descriptions !== false && (
                            <p className="text-[9px] mt-0.5 leading-relaxed" style={{ color: mutedColor }}>{l.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={settings.layout === "compact" ? "space-y-1" : "space-y-2"}>
                      {sampleLinks.map((l) => (
                        <div key={l.slug} className="p-2 transition-opacity"
                          style={previewCardStyle(settings.link_style, accentColor, isDark, borderColor, cardColor, borderRadiusPx)}>
                          <p className="text-xs font-medium" style={{ color: accentColor }}>{l.title}</p>
                          {settings.show_descriptions !== false && (
                            <p className="text-[9px] mt-0.5 leading-relaxed" style={{ color: mutedColor }}>{l.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function previewCardStyle(
  linkStyle: string | undefined,
  accentColor: string,
  isDark: boolean,
  borderColor: string,
  cardColor: string,
  radius: number,
): React.CSSProperties {
  const base = { borderRadius: radius };
  if (linkStyle === "bordered") {
    return { ...base, border: `1px solid ${borderColor}`, backgroundColor: cardColor };
  }
  if (linkStyle === "filled") {
    return { ...base, backgroundColor: `${accentColor}15` };
  }
  return base;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card">
      <div className="px-4 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {icon}
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-foreground">{label}</p>
      <button type="button" onClick={() => onChange(!checked)} className="shrink-0 text-foreground" aria-pressed={checked}>
        {checked ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
      </button>
    </div>
  );
}
