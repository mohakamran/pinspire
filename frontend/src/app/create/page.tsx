"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Board, Pin } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { UploadIcon } from "@/components/icons";
import { Spinner } from "@/components/ui";

const MAX_MB = 10;
const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function CreatePinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", link: "", board_id: "" });
  const [boards, setBoards] = useState<Board[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/create");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<{ data: Board[] }>(`/users/${user.username}/boards`).then((r) => setBoards(r.data)).catch(() => setBoards([]));
  }, [user]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return setErrors({ image: "Use a JPG, PNG, GIF or WebP image." });
    if (f.size > MAX_MB * 1024 * 1024) return setErrors({ image: `Images must be ${MAX_MB} MB or smaller.` });
    setErrors({});
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setErrors({ image: "Choose an image to upload." });
    setBusy(true);
    setErrors({});
    const fd = new FormData();
    fd.append("image", file);
    fd.append("title", form.title.trim());
    if (form.description.trim()) fd.append("description", form.description.trim());
    if (form.link.trim()) fd.append("link", form.link.trim());
    if (form.board_id) fd.append("board_id", form.board_id);
    try {
      const r = await api<{ data: Pin }>("/pins", { method: "POST", body: fd });
      toast("Pin published");
      router.push(`/pin/${r.data.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <Spinner className="py-24" />;

  return (
    <div className="mx-auto max-w-5xl py-4">
      <h1 className="mb-6 text-2xl font-bold">Create pin</h1>
      <form onSubmit={submit} className="flex flex-col gap-8 md:flex-row" noValidate>
        <div className="md:w-[45%]">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
            className={`relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed text-center transition ${drag ? "border-brand bg-orange-50" : "border-neutral-300 bg-neutral-100"}`}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Selected image preview" className="h-full max-h-[600px] w-full object-contain" />
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="btn-secondary absolute right-3 top-3 bg-white">Change</button>
              </>
            ) : (
              <button type="button" onClick={() => input.current?.click()} className="flex flex-col items-center gap-3 p-8">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow"><UploadIcon /></span>
                <span className="font-semibold">Choose a file or drag and drop it here</span>
                <span className="max-w-xs text-sm text-neutral-600">JPG, PNG, GIF or WebP, up to {MAX_MB} MB. Tall images look best.</span>
              </button>
            )}
            <input ref={input} type="file" accept={TYPES.join(",")} className="sr-only" aria-label="Upload image" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          {errors.image && <p className="field-error">{errors.image}</p>}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <label htmlFor="title" className="label">Title</label>
            <input id="title" className="input" maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Add a title" />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" className="input min-h-28" maxLength={800} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add a detailed description" />
          </div>
          <div>
            <label htmlFor="link" className="label">Link</label>
            <input id="link" className="input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://example.com" />
            {errors.link && <p className="field-error">{errors.link}</p>}
          </div>
          <div>
            <label htmlFor="board" className="label">Board</label>
            <select id="board" className="input" value={form.board_id} onChange={(e) => setForm({ ...form, board_id: e.target.value })}>
              <option value="">Don&apos;t add to a board</option>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {errors.board_id && <p className="field-error">{errors.board_id}</p>}
            <p className="mt-1 text-sm text-neutral-600">Need a new board? <Link href={`/${user.username}?tab=saved`} className="underline">Create one on your profile</Link>.</p>
          </div>
          {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
          <div className="flex justify-end">
            <button className="btn-primary px-6 py-3" disabled={busy || !file || !form.title.trim()}>{busy ? "Publishing…" : "Publish"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
