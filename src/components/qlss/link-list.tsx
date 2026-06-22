"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { Trash2, Check, Loader2, Copy, Pencil, Search, X, Download } from "lucide-react";
=======
import {
  Trash2,
  Check,
  X,
  Loader2,
  Copy,
  Folder as FolderIcon,
  Pencil,
} from "lucide-react";
import type { Folder } from "@/components/qlss/folder-manager";
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
<<<<<<< HEAD
=======
  folder_id?: string | null;
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  title?: string | null;
  description?: string | null;
}

/**
<<<<<<< HEAD
 * Link list with search, bulk select, inline edit, and delete.
=======
 * Flat list of the user's short links — CLI style, monospaced, dashed
 * separators between rows.
 *
 * Each row has:
 *   - clickable title (or slug if no title) → /stats/[slug]
 *   - description (if set) shown below the title
 *   - destination URL shown below the description (muted)
 *   - click count
 *   - copy button
 *   - folder badge (click to change folder)
 *   - edit button (pencil) → expands inline title + description editor
 *   - trash icon (single-link delete with confirm)
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
 */
export function LinkList({
  links,
  counts,
  origin,
<<<<<<< HEAD
=======
  folders,
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
}: {
  links: LinkRow[];
  counts: Record<string, number>;
  origin: string;
<<<<<<< HEAD
=======
  folders: Folder[];
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
}) {
  const router = useRouter();
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
<<<<<<< HEAD
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBusySlug, setEditBusySlug] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Bulk
=======

>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

<<<<<<< HEAD
  const filteredLinks = links.filter((link) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      link.slug.toLowerCase().includes(q) ||
      link.destination_url.toLowerCase().includes(q) ||
      (link.title ?? "").toLowerCase().includes(q) ||
      (link.description ?? "").toLowerCase().includes(q)
    );
  });
=======
  // Folder picker per-link (slug of the link whose dropdown is open)
  const [folderPickerSlug, setFolderPickerSlug] = useState<string | null>(null);
  const [folderBusySlug, setFolderBusySlug] = useState<string | null>(null);

  // Inline editor per-link (slug of the link whose editor is open)
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBusySlug, setEditBusySlug] = useState<string | null>(null);
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2

  function toggleSelect(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

<<<<<<< HEAD
  function selectAllVisible() {
    setSelected(new Set(filteredLinks.map((l) => l.slug)));
=======
  function selectAll() {
    setSelected(new Set(links.map((l) => l.slug)));
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkConfirm(false);
  }

  function exitBulkMode() {
    setBulkMode(false);
    clearSelection();
  }

  async function handleSingleDelete(slug: string) {
    setDeletingSlug(slug);
    try {
      await fetch(`/api/links/${slug}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingSlug(null);
      setConfirmSlug(null);
    }
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    try {
      const slugs = Array.from(selected);
      await fetch("/api/links/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      exitBulkMode();
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleCopy(slug: string) {
    const url = `${origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    } catch {
      // ignore
    }
  }

<<<<<<< HEAD
  function handleExportCSV() {
    const rows = [["slug", "destination", "title", "description", "clicks"]];
    for (const link of filteredLinks) {
      rows.push([
        link.slug,
        link.destination_url,
        link.title ?? "",
        link.description ?? "",
        String(counts[link.id] ?? 0),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qlss-links.csv";
    a.click();
    URL.revokeObjectURL(url);
=======
  async function handleSetFolder(slug: string, folderId: string | null) {
    setFolderBusySlug(slug);
    setFolderPickerSlug(null);
    try {
      await fetch(`/api/links/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      router.refresh();
    } finally {
      setFolderBusySlug(null);
    }
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  }

  function openEditor(link: LinkRow) {
    setEditingSlug(link.slug);
    setEditTitle(link.title ?? "");
    setEditDescription(link.description ?? "");
<<<<<<< HEAD
=======
    setFolderPickerSlug(null);
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  }

  function closeEditor() {
    setEditingSlug(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function handleSaveEdit(slug: string) {
    setEditBusySlug(slug);
    try {
      await fetch(`/api/links/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
        }),
      });
      closeEditor();
      router.refresh();
    } finally {
      setEditBusySlug(null);
    }
  }

<<<<<<< HEAD
  return (
    <div>
      {/* Toolbar: search + bulk toggle */}
      <div className="flex items-center justify-between mb-3 text-xs gap-3">
        {!bulkMode ? (
          <div className="flex items-center gap-3">
            {searchOpen ? (
              <div className="flex items-center border border-border bg-background focus-within:border-foreground transition-colors input-focus-glow">
                <Search className="h-3 w-3 text-muted-foreground ml-2 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search links..."
                  className="flex-1 bg-transparent border-0 outline-none py-1.5 text-[11px] px-1.5 placeholder:text-muted-foreground/60 w-36"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="px-2 text-muted-foreground hover:text-foreground touch-target"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 touch-target"
              >
                <Search className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setBulkMode(true)}
              className="text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              select
            </button>
            {filteredLinks.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 touch-target btn-press"
                title="Export as CSV"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">export</span>
              </button>
            )}
            {filteredLinks.length < links.length && search && (
              <span className="text-muted-foreground">
                {filteredLinks.length} of {links.length}
              </span>
            )}
          </div>
=======
  function folderName(id: string | null | undefined): string | null {
    if (!id) return null;
    return folders.find((f) => f.id === id)?.name ?? null;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 text-xs">
        {!bulkMode ? (
          <button
            type="button"
            onClick={() => setBulkMode(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            select
          </button>
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
<<<<<<< HEAD
              onClick={selectAllVisible}
              className="text-muted-foreground hover:text-foreground transition-colors touch-target"
=======
              onClick={selectAll}
              className="text-muted-foreground hover:text-foreground transition-colors"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            >
              all
            </button>
            <button
              type="button"
              onClick={clearSelection}
<<<<<<< HEAD
              className="text-muted-foreground hover:text-foreground transition-colors touch-target"
=======
              className="text-muted-foreground hover:text-foreground transition-colors"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            >
              none
            </button>
            <span className="text-muted-foreground">
              {selected.size} selected
            </span>
          </div>
        )}

<<<<<<< HEAD
        {bulkMode && (
=======
        {bulkMode ? (
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <>
                {bulkConfirm ? (
                  <>
                    <span className="text-muted-foreground">
                      delete {selected.size} link{selected.size === 1 ? "" : "s"}?
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkBusy}
<<<<<<< HEAD
                      className="text-destructive hover:underline disabled:opacity-50 inline-flex items-center gap-1 touch-target"
=======
                      className="text-destructive hover:underline disabled:opacity-50 inline-flex items-center gap-1"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
                    >
                      {bulkBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkConfirm(false)}
                      disabled={bulkBusy}
<<<<<<< HEAD
                      className="text-muted-foreground hover:text-foreground touch-target"
=======
                      className="text-muted-foreground hover:text-foreground"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
                    >
                      cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBulkConfirm(true)}
<<<<<<< HEAD
                    className="text-destructive hover:underline inline-flex items-center gap-1 touch-target"
=======
                    className="text-destructive hover:underline inline-flex items-center gap-1"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
                  >
                    <Trash2 className="h-3 w-3" />
                    delete selected
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={exitBulkMode}
<<<<<<< HEAD
              className="text-muted-foreground hover:text-foreground touch-target"
=======
              className="text-muted-foreground hover:text-foreground"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            >
              done
            </button>
          </div>
<<<<<<< HEAD
        )}
      </div>

      {/* List */}
      {filteredLinks.length === 0 && search ? (
        <div className="border border-border bg-card py-10 text-center">
          <p className="text-xs text-muted-foreground">
            no links match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <ul className="border-t border-border">
          {filteredLinks.map((link, i) => {
            const clickCount = counts[link.id] ?? 0;
            const shortUrl = `${origin}/${link.slug}`;
            const isConfirming = confirmSlug === link.slug;
            const isDeleting = deletingSlug === link.slug;
            const isSelected = selected.has(link.slug);
            const isEditing = editingSlug === link.slug;
            const isEditBusy = editBusySlug === link.slug;
            const displayTitle = link.title ?? shortUrl;

            return (
              <li
                key={link.id}
                className="relative list-item-enter"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <div
                  className={`py-2.5 -mx-2 px-2 group transition-colors link-row-hover ${
                    isSelected ? "bg-accent/60" : "hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                      {bulkMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelect(link.slug)}
                          className={`shrink-0 w-4 h-4 border flex items-center justify-center transition-colors touch-target ${
                            isSelected
                              ? "bg-foreground border-foreground"
                              : "bg-background border-border"
                          }`}
                          aria-label={`Select ${link.slug}`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-background" />
                          )}
                        </button>
                      )}
                      <a
                        href={`/stats/${link.slug}`}
                        className="min-w-0 flex-1 block"
                      >
                        <p className="text-xs font-medium truncate group-hover:underline">
                          {displayTitle}
                        </p>
                        {link.description && !isEditing && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {link.description}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">
                          -&gt; {link.destination_url}
                        </p>
                      </a>
                    </div>
                    <div className="text-right shrink-0 text-[11px] text-muted-foreground tabular-nums flex items-baseline gap-2">
                      <span>
                        <span className="text-foreground font-medium">
                          {clickCount}
                        </span>{" "}
                        {clickCount === 1 ? "click" : "clicks"}
                      </span>

                      {!bulkMode && !isEditing && (
                        <button
                          type="button"
                          onClick={() => openEditor(link)}
                          className="text-muted-foreground hover:text-foreground transition-colors touch-target"
                          aria-label="Edit"
                          title="Edit title and description"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}

                      {!bulkMode && (
                        <button
                          type="button"
                          onClick={() => handleCopy(link.slug)}
                          className="text-muted-foreground hover:text-foreground transition-colors touch-target"
                          aria-label="Copy short URL"
                        >
                          {copiedSlug === link.slug ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}

                      {!bulkMode && !isEditing &&
                        (isConfirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSingleDelete(link.slug)}
                              disabled={isDeleting}
                              className="text-destructive hover:underline disabled:opacity-50 touch-target"
                            >
                              {isDeleting ? "..." : "confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmSlug(null)}
                              className="text-muted-foreground hover:text-foreground touch-target"
                            >
                              cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmSlug(link.slug)}
                            disabled={isDeleting}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 touch-target"
                            aria-label={`Delete ${link.slug}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Inline editor */}
                  {isEditing && (
                    <div className="mt-3 border border-border bg-background p-3 space-y-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                          title
                        </label>
                        <div className="input-focus-glow border border-border">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="a short title for this link"
                            className="w-full bg-transparent px-2 py-1.5 text-xs outline-none"
                            maxLength={140}
                            disabled={isEditBusy}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                          description
                        </label>
                        <div className="input-focus-glow border border-border">
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="what is this link for?"
                            className="w-full bg-transparent px-2 py-1.5 text-xs outline-none resize-y min-h-16"
                            maxLength={500}
                            rows={2}
                            disabled={isEditBusy}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={closeEditor}
                          disabled={isEditBusy}
                          className="text-xs text-muted-foreground hover:text-foreground touch-target"
                        >
                          cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(link.slug)}
                          disabled={isEditBusy}
                          className="text-xs bg-foreground text-background hover:bg-foreground/90 px-3 py-1 inline-flex items-center gap-1 btn-press touch-target"
                        >
                          {isEditBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {i < filteredLinks.length - 1 && <hr className="hr-dashed border-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
=======
        ) : null}
      </div>

      {/* List */}
      <ul className="border-t border-border">
        {links.map((link, i) => {
          const clickCount = counts[link.id] ?? 0;
          const shortUrl = `${origin}/${link.slug}`;
          const isConfirming = confirmSlug === link.slug;
          const isDeleting = deletingSlug === link.slug;
          const isSelected = selected.has(link.slug);
          const fName = folderName(link.folder_id);
          const isFolderBusy = folderBusySlug === link.slug;
          const isFolderPickerOpen = folderPickerSlug === link.slug;
          const isEditing = editingSlug === link.slug;
          const isEditBusy = editBusySlug === link.slug;
          const displayTitle = link.title ?? shortUrl;

          return (
            <li key={link.id} className="relative">
              <div
                className={`py-2.5 -mx-2 px-2 group transition-colors ${
                  isSelected ? "bg-accent/60" : "hover:bg-accent/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-2 min-w-0 flex-1">
                    {bulkMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelect(link.slug)}
                        className={`shrink-0 w-4 h-4 border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-foreground border-foreground"
                            : "bg-background border-border"
                        }`}
                        aria-label={`Select ${link.slug}`}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-background" />
                        )}
                      </button>
                    )}
                    <a
                      href={`/stats/${link.slug}`}
                      className="min-w-0 flex-1 block"
                    >
                      <p className="text-xs font-medium truncate group-hover:underline">
                        {displayTitle}
                      </p>
                      {link.description && !isEditing && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                          {link.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">
                        -&gt; {link.destination_url}
                      </p>
                    </a>
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-muted-foreground tabular-nums flex items-baseline gap-2">
                    {/* Folder badge */}
                    {!bulkMode && (
                      <button
                        type="button"
                        onClick={() =>
                          setFolderPickerSlug(isFolderPickerOpen ? null : link.slug)
                        }
                        disabled={isFolderBusy}
                        className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 border border-border px-1.5 py-0.5 disabled:opacity-50"
                        title="Set folder"
                      >
                        {isFolderBusy ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <FolderIcon className="h-2.5 w-2.5" />
                        )}
                        {fName ?? "—"}
                      </button>
                    )}

                    <span>
                      <span className="text-foreground font-medium">
                        {clickCount}
                      </span>{" "}
                      {clickCount === 1 ? "click" : "clicks"}
                    </span>

                    {/* Edit (pencil) */}
                    {!bulkMode && !isEditing && (
                      <button
                        type="button"
                        onClick={() => openEditor(link)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit title and description"
                        title="Edit title and description"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}

                    {/* Copy */}
                    {!bulkMode && (
                      <button
                        type="button"
                        onClick={() => handleCopy(link.slug)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Copy short URL"
                      >
                        {copiedSlug === link.slug ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}

                    {/* Delete */}
                    {!bulkMode && !isEditing &&
                      (isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSingleDelete(link.slug)}
                            disabled={isDeleting}
                            className="text-destructive hover:underline disabled:opacity-50"
                          >
                            {isDeleting ? "..." : "confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSlug(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmSlug(link.slug)}
                          disabled={isDeleting}
                          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          aria-label={`Delete ${link.slug}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ))}
                  </div>
                </div>

                {/* Inline editor */}
                {isEditing && (
                  <div className="mt-3 border border-border bg-background p-3 space-y-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                        title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="a short title for this link"
                        className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground"
                        maxLength={140}
                        disabled={isEditBusy}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                        description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="what is this link for?"
                        className="w-full bg-transparent border border-border px-2 py-1.5 text-xs outline-none focus:border-foreground resize-y min-h-16"
                        maxLength={500}
                        rows={2}
                        disabled={isEditBusy}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={closeEditor}
                        disabled={isEditBusy}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(link.slug)}
                        disabled={isEditBusy}
                        className="text-xs bg-foreground text-background hover:bg-foreground/90 px-3 py-1 inline-flex items-center gap-1"
                      >
                        {isEditBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        save
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Folder picker dropdown */}
              {isFolderPickerOpen && !isEditing && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border shadow-sm w-48">
                  <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                    move to folder
                  </div>
                  <ul className="max-h-48 overflow-y-auto">
                    <li>
                      <button
                        type="button"
                        onClick={() => handleSetFolder(link.slug, null)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent/60 transition-colors ${
                          !link.folder_id ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        — no folder —
                      </button>
                    </li>
                    {folders.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => handleSetFolder(link.slug, f.id)}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent/60 transition-colors ${
                            link.folder_id === f.id
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {f.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {i < links.length - 1 && <hr className="hr-dashed border-0" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Keep the X icon import referenced.
void X;
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
