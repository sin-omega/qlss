"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Plus, Trash2, Loader2, Check, X, User } from "lucide-react";

export interface Folder {
  id: string;
  name: string;
  created_at: string;
  profile_page?: boolean;
}

/**
 * Folder manager component for the links page.
 *
 * - Shows a row of filter chips: "all" | "unsorted" | <each folder>
 * - "+ new" button to create a folder
 * - Each folder chip has a small × to delete it (with confirm)
 * - Profile page folder is marked with a user icon and cannot be deleted
 *
 * Props:
 *   - folders: initial list (server-fetched)
 *   - activeFolderId: which filter is currently active
 *     - "all" → show all links
 *     - "unsorted" → show only links with folder_id = null
 *     - <uuid> → show only links in that folder
 *   - onActiveChange: callback when the user picks a different filter
 */
export function FolderManager({
  folders: initialFolders,
  activeFolderId,
  onActiveChange,
}: {
  folders: Folder[];
  activeFolderId: string;
  onActiveChange: (id: string) => void;
}) {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingProfilePage, setCreatingProfilePage] = useState(false);

  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  const hasProfilePageFolder = folders.some((f) => f.profile_page);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          profile_page: creatingProfilePage,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not create folder.");
        return;
      }
      setFolders((prev) => [...prev, json.folder]);
      setNewName("");
      setCreating(false);
      setCreatingProfilePage(false);
      // Auto-select the new folder
      onActiveChange(json.folder.id);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error ?? "Could not delete folder.");
        return;
      }
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (activeFolderId === id) onActiveChange("all");
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          active={activeFolderId === "all"}
          onClick={() => onActiveChange("all")}
        >
          all
        </Chip>
        <Chip
          active={activeFolderId === "unsorted"}
          onClick={() => onActiveChange("unsorted")}
        >
          unsorted
        </Chip>
        {folders.map((f) => (
          <span key={f.id} className="inline-flex items-center">
            <Chip
              active={activeFolderId === f.id}
              onClick={() => onActiveChange(f.id)}
            >
              {f.profile_page && (
                <User className="h-3 w-3 inline mr-0.5 text-foreground" />
              )}
              <Folder className="h-3 w-3 inline mr-1" />
              {f.name}
            </Chip>
            {/* Profile page folders cannot be deleted */}
            {!f.profile_page &&
              (confirmDeleteId === f.id ? (
                <span className="inline-flex items-center ml-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    disabled={busy}
                    className="text-destructive hover:underline"
                  >
                    del?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(f.id)}
                  className="text-muted-foreground hover:text-destructive ml-0.5 text-[11px]"
                  aria-label={`Delete folder ${f.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ))}
          </span>
        ))}

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-dashed border-border bg-background hover:bg-accent/40 transition-colors"
          >
            <Plus className="h-3 w-3" />
            new folder
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="inline-flex items-center gap-1"
          >
            {!hasProfilePageFolder && (
              <button
                type="button"
                onClick={() => setCreatingProfilePage((p) => !p)}
                className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 border transition-colors ${
                  creatingProfilePage
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                title="Mark as profile page folder — links in here appear on your public profile"
              >
                <User className="h-2.5 w-2.5" />
                profile
              </button>
            )}
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={creatingProfilePage ? "profile page" : "folder name"}
              className="text-xs bg-background border border-border px-2 py-1 outline-none focus:border-foreground w-32"
              maxLength={32}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="text-foreground hover:opacity-70 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName("");
                setCreatingProfilePage(false);
                setError(null);
              }}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </form>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-destructive">! {error}</p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 border transition-colors whitespace-nowrap ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
