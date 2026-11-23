"use client";

import { useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Board } from "@/lib/types";

/** Create (no board) or edit (board given) a board. */
export function BoardForm({ board, onSaved, onCancel }: { board?: Board; onSaved: (b: Board) => void; onCancel: () => void }) {
  const [name, setName] = useState(board?.name ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(board?.is_private ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { name: name.trim(), description: description.trim() || null, is_private: isPrivate };
      const r = board
        ? await api<{ data: Board }>(`/boards/${board.id}`, { method: "PATCH", body })
        : await api<{ data: Board }>("/boards", { method: "POST", body });
      onSaved(r.data);
    } catch (err) {
      setErrors(err instanceof ApiError && Object.keys(err.errors).length ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])) : { form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="board-name" className="label">Name</label>
        <input id="board-name" className="input" autoFocus maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder='Like "Places to go" or "Recipes to make"' />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="board-desc" className="label">Description (optional)</label>
        <textarea id="board-desc" className="input min-h-20" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-neutral-900" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        <span><span className="block font-semibold">Keep this board secret</span><span className="text-sm text-neutral-600">Only you can see it</span></span>
      </label>
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy || !name.trim()}>{busy ? "Saving…" : board ? "Save" : "Create"}</button>
      </div>
    </form>
  );
}
