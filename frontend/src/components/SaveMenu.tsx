"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Board, Pin } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ChevronDown, LockIcon } from "./icons";

/**
 * "Save" button with a board picker: lists the viewer's boards (with saved state for this pin),
 * toggles membership, and can create a new board and save into it in one step.
 */
export function SaveMenu({ pin, onChange, compact = false }: { pin: Pin; onChange?: (patch: Partial<Pin>) => void; compact?: boolean }) {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loadBoards = async () => {
    if (!user) return;
    setError(null);
    try {
      const res = await api<{ data: Board[] }>(`/users/${user.username}/boards?pin_id=${pin.id}`);
      setBoards(res.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/pin/${pin.id}`)}`);
      return;
    }
    if (!open) loadBoards();
    setOpen(!open);
  };

  const applySaved = (list: Board[], savesCount: number) => {
    setBoards(list);
    onChange?.({ is_saved: list.some((b) => b.has_pin), saves_count: savesCount });
  };

  const toggleBoard = async (board: Board) => {
    setBusy(board.id);
    try {
      const res = await api<{ saved: boolean; saves_count: number }>(`/boards/${board.id}/pins/${pin.id}`, {
        method: board.has_pin ? "DELETE" : "POST",
      });
      const list = (boards ?? []).map((b) => (b.id === board.id ? { ...b, has_pin: res.saved, pins_count: (b.pins_count ?? 0) + (res.saved ? 1 : -1) } : b));
      applySaved(list, res.saves_count);
      toast(res.saved ? `Saved to ${board.name}` : `Removed from ${board.name}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const createAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError(null);
    try {
      const res = await api<{ data: Board }>("/boards", { method: "POST", body: { name: newName.trim() } });
      const saved = await api<{ saved: boolean; saves_count: number }>(`/boards/${res.data.id}/pins/${pin.id}`, { method: "POST" });
      applySaved([{ ...res.data, has_pin: true, pins_count: 1 }, ...(boards ?? [])], saved.saves_count);
      setCreating(false);
      setNewName("");
      toast(`Saved to ${res.data.name}`);
    } catch (err) {
      setNewError(err instanceof ApiError ? err.field("name") ?? err.message : errorMessage(err));
    }
  };

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${pin.is_saved ? "btn-dark" : "btn-primary"} ${compact ? "px-3.5 py-2" : "px-5 py-3"}`}
      >
        {pin.is_saved ? "Saved" : "Save"}
        {!compact && <ChevronDown />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl bg-white p-2 text-left text-neutral-900 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <div className="px-3 py-2 text-center text-sm font-semibold">Save to board</div>
          {error && <p className="px-3 py-2 text-sm text-red-700">{error}</p>}
          {!boards && !error && <p className="px-3 py-4 text-center text-sm text-neutral-500">Loading boards…</p>}
          <div className="max-h-64 overflow-y-auto">
            {boards?.length === 0 && <p className="px-3 py-2 text-sm text-neutral-600">No boards yet. Create one below.</p>}
            {boards?.map((b) => (
              <button
                key={b.id}
                role="menuitemcheckbox"
                aria-checked={!!b.has_pin}
                disabled={busy === b.id}
                onClick={() => toggleBoard(b)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 disabled:opacity-60"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                  {b.cover_images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.cover_images[0]} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {b.name} {b.is_private && <LockIcon className="inline h-3 w-3" />}
                </span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${b.has_pin ? "bg-neutral-900 text-white" : "bg-brand text-white"}`}>
                  {busy === b.id ? "…" : b.has_pin ? "Saved" : "Save"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-neutral-200 pt-2">
            {creating ? (
              <form onSubmit={createAndSave} className="flex flex-col gap-2 px-2 pb-1">
                <label className="label" htmlFor={`nb-${pin.id}`}>Board name</label>
                <input id={`nb-${pin.id}`} className="input py-2" autoFocus value={newName} maxLength={50} onChange={(e) => setNewName(e.target.value)} placeholder='Like "Places to go"' />
                {newError && <p className="field-error">{newError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-secondary py-2" onClick={() => setCreating(false)}>Cancel</button>
                  <button className="btn-primary py-2" disabled={!newName.trim()}>Create</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setCreating(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-neutral-100">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-200 text-xl">+</span>
                Create board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
