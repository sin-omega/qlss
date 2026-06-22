"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import {
  Users,
  LinkIcon,
  AlertTriangle,
  Megaphone,
  Loader2,
  Check,
  Trash2,
  ShieldCheck,
  ShieldX,
  Eye,
} from "lucide-react";
import { siteOrigin } from "@/lib/env";

type Tab = "users" | "links" | "abuse" | "banner";

/* ── Types ── */
interface AdminUser {
  id: string;
  email: string;
  is_admin: boolean;
  banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
}

interface AdminLink {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  title: string | null;
  description: string | null;
  user_id: string | null;
  clicks: number;
  owner_email: string;
}

interface AbuseReport {
  id: string;
  reporter_email: string | null;
  link_slug: string | null;
  message: string;
  ip_address: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/* ── Tab indicator logic (matches home-content) ── */
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "users", label: "users", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "links", label: "all links", icon: <LinkIcon className="h-3.5 w-3.5" /> },
  {
    key: "abuse",
    label: "abuse reports",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  {
    key: "banner",
    label: "banner",
    icon: <Megaphone className="h-3.5 w-3.5" />,
  },
];

export function AdminPanel({
  initialUsers,
  initialLinks,
  initialReports,
  initialBannerText,
}: {
  initialUsers: AdminUser[];
  initialLinks: AdminLink[];
  initialReports: AbuseReport[];
  initialBannerText: string;
}) {
  const [tab, setTab] = useState<Tab>("users");
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const indicatorRef = useRef<HTMLDivElement>(null);

  const origin = siteOrigin();

  const updateIndicator = useCallback(() => {
    const btn = tabBtnRefs.current.get(tab);
    const container = tabContainerRef.current;
    const indicator = indicatorRef.current;
    if (!btn || !container || !indicator) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    indicator.style.width = `${btnRect.width}px`;
    indicator.style.transform = `translateX(${btnRect.left - containerRect.left}px)`;
  }, [tab]);

  useEffect(() => {
    updateIndicator();
  }, [tab, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <>
      <h1 className="text-lg font-bold tracking-tight mb-1">admin panel</h1>
      <p className="text-[11px] text-muted-foreground mb-4">
        manage users, links, and site settings
      </p>

      {/* Tab bar */}
      <div
        ref={tabContainerRef}
        className="relative flex border border-border bg-card mb-4 overflow-x-auto"
        role="tablist"
        aria-label="Admin sections"
      >
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              if (el) tabBtnRefs.current.set(t.key, el);
            }}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs transition-colors touch-target btn-press whitespace-nowrap ${
              i > 0 ? "border-l border-border" : ""
            } ${
              tab === t.key
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <div
          ref={indicatorRef}
          className="tab-indicator absolute bottom-0 left-0 h-[2px] bg-foreground"
        />
      </div>

      {/* Tab content */}
      <div key={tab} className="tab-content-enter">
        {tab === "users" && <UsersTab users={initialUsers} />}
        {tab === "links" && <LinksTab links={initialLinks} origin={origin} />}
        {tab === "abuse" && <AbuseTab reports={initialReports} />}
        {tab === "banner" && (
          <BannerTab initialText={initialBannerText} />
        )}
      </div>
    </>
  );
}

/* ── Users Tab ── */
function UsersTab({ users }: { users: AdminUser[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [localUsers, setLocalUsers] = useState(users);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userLinks, setUserLinks] = useState<{ slug: string; destination_url: string; clicks: number; created_at: string }[]>([]);
  const [userTotalClicks, setUserTotalClicks] = useState(0);
  const [userLinksLoading, setUserLinksLoading] = useState(false);
  const [userLinksError, setUserLinksError] = useState<string | null>(null);
  const origin = siteOrigin();

  async function handleBan(id: string) {
    const reason = prompt("Ban reason (optional):") ?? "";
    setBusy(id);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban", reason }),
      });
      setLocalUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, banned: true, banned_at: new Date().toISOString(), banned_reason: reason || null }
            : u,
        ),
      );
    } catch {
      // ignore
    } finally {
      setBusy(null);
    }
  }

  async function handleUnban(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });
      setLocalUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, banned: false, banned_at: null, banned_reason: null }
            : u,
        ),
      );
    } catch {
      // ignore
    } finally {
      setBusy(null);
    }
  }

  async function handleViewLinks(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserLinks([]);
      setUserLinksError(null);
      return;
    }
    setExpandedUser(userId);
    setUserLinksLoading(true);
    setUserLinks([]);
    setUserLinksError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/stats`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        setUserLinksError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      const links = Array.isArray(data.links) ? data.links : [];
      setUserLinks(links);
      setUserTotalClicks(links.reduce((s: number, l: { clicks?: number }) => s + (l.clicks ?? 0), 0));
    } catch (err) {
      setUserLinksError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUserLinksLoading(false);
    }
  }

  if (localUsers.length === 0) {
    return (
      <div className="border border-border bg-card py-12 text-center">
        <p className="text-xs text-muted-foreground">no users found</p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card max-h-96 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-border">
          <tr className="text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">email</th>
            <th className="px-3 py-2 font-medium hidden sm:table-cell">joined</th>
            <th className="px-3 py-2 font-medium">role</th>
            <th className="px-3 py-2 font-medium">status</th>
            <th className="px-3 py-2 font-medium text-right">action</th>
          </tr>
        </thead>
        <tbody>
          {localUsers.map((u) => {
            const isBusy = busy === u.id;
            const isExpanded = expandedUser === u.id;
            return (
              <Fragment key={u.id}>
                <tr
                  className={`border-b border-border transition-colors hover:bg-accent/40 ${
                    u.banned ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-3 py-2 truncate max-w-[180px]">
                    <span className={u.banned ? "text-muted-foreground line-through" : ""}>
                      {u.email || u.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        admin
                      </span>
                    ) : (
                      <span className="text-muted-foreground">user</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.banned ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <ShieldX className="h-3 w-3" />
                        banned
                      </span>
                    ) : (
                      <span className="text-muted-foreground">active</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleViewLinks(u.id)}
                        className="text-xs border border-border hover:bg-accent px-2 py-1 transition-colors inline-flex items-center gap-1"
                        title={isExpanded ? "Hide links" : "View links"}
                      >
                        <LinkIcon className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">{isExpanded ? "hide" : "links"}</span>
                      </button>
                      {!u.is_admin && (
                        isBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : u.banned ? (
                          <button
                            type="button"
                            onClick={() => handleUnban(u.id)}
                            className="text-xs border border-border hover:bg-accent px-2 py-1 transition-colors"
                          >
                            unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBan(u.id)}
                            className="text-xs border border-border hover:bg-accent text-destructive px-2 py-1 transition-colors"
                          >
                            ban
                          </button>
                        )
                      )}
                    </div>
                    {u.banned && u.banned_reason && (
                      <p className="text-[10px] text-muted-foreground mt-1 text-right truncate" title={u.banned_reason}>
                        {u.banned_reason}
                      </p>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 bg-accent/10">
                      {userLinksLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          loading links...
                        </div>
                      ) : userLinksError ? (
                        <div className="py-2">
                          <p className="text-xs text-destructive">{userLinksError}</p>
                          <button
                            type="button"
                            onClick={() => handleViewLinks(u.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline mt-1"
                          >
                            retry
                          </button>
                        </div>
                      ) : userLinks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">no links for this user</p>
                      ) : (
                        <div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                            <span><span className="text-foreground font-medium">{userLinks.length}</span> links</span>
                            <span><span className="text-foreground font-medium">{userTotalClicks}</span> total clicks</span>
                          </div>
                          <div className="border border-border bg-card max-h-40 overflow-y-auto">
                            <table className="w-full text-[11px]">
                              <thead className="border-b border-border">
                                <tr className="text-left text-muted-foreground">
                                  <th className="px-2 py-1 font-medium">slug</th>
                                  <th className="px-2 py-1 font-medium hidden md:table-cell">destination</th>
                                  <th className="px-2 py-1 font-medium">clicks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userLinks.map((l) => (
                                  <tr key={l.slug} className="border-b border-border last:border-0">
                                    <td className="px-2 py-1 truncate max-w-[100px]">
                                      <a href={`${origin}/${l.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline font-medium">
                                        /{l.slug}
                                      </a>
                                    </td>
                                    <td className="px-2 py-1 text-muted-foreground hidden md:table-cell truncate max-w-[200px]" title={l.destination_url}>
                                      {l.destination_url}
                                    </td>
                                    <td className="px-2 py-1 tabular-nums">{l.clicks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Links Tab ── */
function LinksTab({ links, origin }: { links: AdminLink[]; origin: string }) {
  const [search, setSearch] = useState("");
  const [localLinks, setLocalLinks] = useState(links);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const filtered = localLinks.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.slug.toLowerCase().includes(q) ||
      l.destination_url.toLowerCase().includes(q) ||
      (l.owner_email ?? "").toLowerCase().includes(q) ||
      (l.title ?? "").toLowerCase().includes(q)
    );
  });

  const totalClicks = localLinks.reduce((sum, l) => sum + l.clicks, 0);

  async function handleDeleteLink(slug: string) {
    if (!confirm(`Delete /${slug}? This cannot be undone.`)) return;
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/admin/links/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (res.ok) {
        setLocalLinks((prev) => prev.filter((l) => l.slug !== slug));
      }
    } catch {
      // ignore
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="border border-border bg-card px-4 py-2.5 flex items-center gap-6 mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LinkIcon className="h-3 w-3" />
          <span>
            <span className="text-foreground font-medium">{localLinks.length}</span> links
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-foreground font-medium">{totalClicks}</span> total clicks
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center border border-border bg-background focus-within:border-foreground transition-colors input-focus-glow mb-3">
        <span className="pl-3 pr-2 text-muted-foreground select-none text-xs">&gt;</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter by slug, url, or owner..."
          className="flex-1 bg-transparent border-0 outline-none py-2 text-xs placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border border-border bg-card py-10 text-center">
          <p className="text-xs text-muted-foreground">
            {search ? `no links match "${search}"` : "no links yet"}
          </p>
        </div>
      ) : (
        <div className="border border-border bg-card max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">slug</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">destination</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">owner</th>
                <th className="px-3 py-2 font-medium">clicks</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">created</th>
                <th className="px-3 py-2 font-medium text-right">action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-accent/40"
                >
                  <td className="px-3 py-2">
                    <a
                      href={`${origin}/${l.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline truncate-ellipsis inline-block max-w-[120px]"
                      title={`/${l.slug}`}
                    >
                      /{l.slug}
                    </a>
                    {l.title && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={l.title}>
                        {l.title}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell truncate max-w-[200px]" title={l.destination_url}>
                    -&gt; {l.destination_url}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell truncate max-w-[140px]" title={l.owner_email}>
                    {l.owner_email || l.user_id?.slice(0, 8) || "anon"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {l.clicks}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                    {formatDate(l.created_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {deletingSlug === l.slug ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mx-auto" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(l.slug)}
                        className="text-xs border border-border hover:bg-accent text-destructive px-2 py-1 transition-colors inline-flex items-center gap-1"
                        title="Delete link"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Abuse Reports Tab ── */
function AbuseTab({ reports }: { reports: AbuseReport[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [localReports, setLocalReports] = useState(reports);

  async function handleReview(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/admin/abuse/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review" }),
      });
      setLocalReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, reviewed: true, reviewed_at: new Date().toISOString() }
            : r,
        ),
      );
    } catch {
      // ignore
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this abuse report?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/abuse/${id}/delete`, { method: "DELETE" });
      setLocalReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    } finally {
      setBusy(null);
    }
  }

  const unreviewed = localReports.filter((r) => !r.reviewed).length;

  return (
    <div>
      {localReports.length > 0 && (
        <div className="border border-border bg-card px-4 py-2.5 flex items-center gap-6 mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            <span>
              <span className="text-foreground font-medium">{localReports.length}</span> reports
            </span>
          </div>
          {unreviewed > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                <span className="text-foreground font-medium">{unreviewed}</span> unreviewed
              </span>
            </div>
          )}
        </div>
      )}

      {localReports.length === 0 ? (
        <div className="border border-border bg-card py-12 text-center">
          <p className="text-xs text-muted-foreground">no abuse reports</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {localReports.map((r) => {
            const isBusy = busy === r.id;
            return (
              <div
                key={r.id}
                className={`border border-border bg-card p-3 transition-colors ${
                  r.reviewed ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {r.link_slug ? (
                          <a
                            href={`/${r.link_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground hover:underline"
                          >
                            /{r.link_slug}
                          </a>
                        ) : (
                          "no link"
                        )}
                      </span>
                      {r.ip_address && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {r.ip_address}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{r.message}</p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {formatDate(r.created_at)}
                      {r.reviewed && r.reviewed_at && (
                        <span className="ml-2">
                          reviewed {formatDate(r.reviewed_at)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        {!r.reviewed && (
                          <button
                            type="button"
                            onClick={() => handleReview(r.id)}
                            className="text-xs border border-border hover:bg-accent px-2 py-1 transition-colors inline-flex items-center gap-1"
                            title="Mark as reviewed"
                          >
                            <Eye className="h-3 w-3" />
                            <span className="hidden sm:inline">review</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="text-xs border border-border hover:bg-accent text-destructive px-2 py-1 transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Banner Tab ── */
function BannerTab({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border bg-card p-4 space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        set a dismissible info banner shown at the top of the home page.
        leave empty to hide the banner.
      </p>
      <div className="input-focus-glow border border-border">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="banner text (e.g. welcome to qlss)"
          className="w-full bg-transparent px-3 py-2 text-xs outline-none resize-y min-h-16"
          maxLength={500}
          rows={3}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {text.length}/500
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="text-xs bg-foreground text-background hover:bg-foreground/90 px-4 py-1.5 inline-flex items-center gap-1.5 btn-press transition-colors disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : saved ? (
            <Check className="h-3 w-3" />
          ) : null}
          {saved ? "saved" : "save"}
        </button>
      </div>

      {/* Preview */}
      {text.trim() && (
        <div className="mt-2 pt-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            preview
          </p>
          <div className="border border-border bg-background px-3 py-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{text}</p>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */
function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
