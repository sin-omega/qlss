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
  Link2,
  X,
  Plus,
  Eye,
  ExternalLink,
  Sparkles,
} from "lucide-react";

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
  banner_url?: string;
  link_style?: "bordered" | "minimal" | "filled";
  font_style?: "mono" | "serif" | "sans";
  social_links?: SocialLink[];
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

const LAYOUT_OPTIONS = [
  { label: "List", value: "list", desc: "clean vertical stack" },
  { label: "Grid", value: "grid", desc: "2-column card grid" },
  { label: "Compact", value: "compact", desc: "tight, minimal spacing" },
] as const;

const LINK_STYLES = [
  { label: "Bordered", value: "bordered", desc: "subtle border cards" },
  { label: "Minimal", value: "minimal", desc: "no border, clean" },
  { label: "Filled", value: "filled", desc: "solid background cards" },
] as const;

const FONT_OPTIONS = [
  { label: "Mono", value: "mono", desc: "code-style font" },
  { label: "Sans", value: "sans", desc: "clean modern font" },
  { label: "Serif", value: "serif", desc: "classic book font" },
] as const;

const SOCIAL_PLATFORMS = [
  "github",
  "twitter",
  "instagram",
  "linkedin",
  "youtube",
  "twitch",
  "discord",
  "website",
  "email",
  "custom",
];

/**
 * Profile page customizer — a dashboard page where users can tweak
 * how their public profile (/@username) looks.
 */
export function ProfileCustomizer({
  initialSettings,
}: {
  initialSettings: Record<string, unknown>;
}) {
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>(
    initialSettings as Settings,
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Social links editor state
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    (initialSettings.social_links as SocialLink[]) ?? [],
  );
  const [newPlatform, setNewPlatform] = useState("github");
  const [newUrl, setNewUrl] = useState("");

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

  function addSocialLink() {
    if (!newUrl.trim()) return;
    setSocialLinks((prev) => [
      ...prev,
      { platform: newPlatform, url: newUrl.trim() },
    ]);
    setNewUrl("");
    setSaved(false);
  }

  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  const isDark =
    settings.bg_color &&
    ["#0f172a", "#1e293b", "#334155", "#1e1b4b"].includes(
      settings.bg_color,
    );

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ─── Theme Color ─── */}
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
        {settings.theme_color && (
          <input
            type="text"
            value={settings.theme_color}
            onChange={(e) => update("theme_color", e.target.value)}
            className="mt-2 text-xs bg-transparent border border-border px-2 py-1 outline-none focus:border-foreground w-24"
            placeholder="custom hex"
          />
        )}
      </Section>

      {/* ─── Background Color ─── */}
      <Section
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title="background"
      >
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
        {settings.bg_color && (
          <input
            type="text"
            value={settings.bg_color}
            onChange={(e) => update("bg_color", e.target.value)}
            className="mt-2 text-xs bg-transparent border border-border px-2 py-1 outline-none focus:border-foreground w-24"
            placeholder="custom hex"
          />
        )}
      </Section>

      {/* ─── Display Name ─── */}
      <Section
        icon={<Type className="h-3.5 w-3.5" />}
        title="display name"
      >
        <div className="flex items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
          <input
            type="text"
            value={settings.display_name ?? ""}
            onChange={(e) => update("display_name", e.target.value)}
            placeholder="shown instead of @username (optional)"
            className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs placeholder:text-muted-foreground/60"
            maxLength={32}
          />
          {settings.display_name && (
            <button
              type="button"
              onClick={() => update("display_name", "")}
              className="px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Section>

      {/* ─── Layout ─── */}
      <Section icon={<Layout className="h-3.5 w-3.5" />} title="layout">
        <div className="flex gap-2">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("layout", opt.value)}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                settings.layout === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ─── Link Style ─── */}
      <Section icon={<Link2 className="h-3.5 w-3.5" />} title="link style">
        <div className="flex gap-2">
          {LINK_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("link_style", opt.value)}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                settings.link_style === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ─── Font Style ─── */}
      <Section icon={<Type className="h-3.5 w-3.5" />} title="font style">
        <div className="flex gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("font_style", opt.value)}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                settings.font_style === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ─── Toggle Options ─── */}
      <Section
        icon={<ToggleLeft className="h-3.5 w-3.5" />}
        title="toggles"
      >
        <div className="space-y-2">
          <ToggleRow
            label="Show link descriptions"
            description="display descriptions under link titles"
            checked={settings.show_descriptions !== false}
            onChange={(v) => update("show_descriptions", v)}
          />
          <ToggleRow
            label="Show destination URLs"
            description="show the full destination under each link"
            checked={settings.show_destination !== false}
            onChange={(v) => update("show_destination", v)}
          />
        </div>
      </Section>

      {/* ─── Social Links ─── */}
      <Section icon={<Link2 className="h-3.5 w-3.5" />} title="social links">
        <div className="space-y-2">
          {socialLinks.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic">
              no social links added
            </p>
          )}
          {socialLinks.map((sl, i) => (
            <div
              key={i}
              className="flex items-center gap-2 border border-border bg-card px-2 py-1.5"
            >
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-16 truncate shrink-0">
                {sl.platform}
              </span>
              <span className="text-xs text-muted-foreground truncate flex-1">
                {sl.url}
              </span>
              <button
                type="button"
                onClick={() => removeSocialLink(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add new social link */}
          <div className="flex items-center gap-2">
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              className="text-xs bg-background border border-border px-2 py-1 outline-none"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 text-xs bg-background border border-border px-2 py-1 outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={addSocialLink}
              disabled={!newUrl.trim()}
              className="text-foreground hover:opacity-70 disabled:opacity-30"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </Section>

      {/* ─── Save ─── */}
      <div className="flex items-center justify-between">
        <a
          href={`/@${settings.display_name ?? ""}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <Eye className="h-3 w-3" />
          preview profile
        </a>

        <div className="flex items-center gap-3">
          {error && (
            <p className="text-xs text-destructive">! {error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="text-xs bg-foreground text-background hover:bg-foreground/90 px-4 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-3 w-3" /> saved
              </>
            ) : (
              <>
                <Check className="h-3 w-3" /> save settings
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="shrink-0 text-foreground"
        aria-pressed={checked}
      >
        {checked ? (
          <ToggleRight className="h-5 w-5" />
        ) : (
          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
