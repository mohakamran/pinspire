"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Comment, Paginated, Pin } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PinGrid } from "@/components/PinGrid";
import { SaveMenu } from "@/components/SaveMenu";
import { sharePin } from "@/components/PinCard";
import { FollowButton } from "@/components/FollowButton";
import { ArrowLeft, DotsIcon, HeartIcon, LinkIcon, ShareIcon } from "@/components/icons";
import { Avatar, ErrorState, Spinner, formatCount, timeAgo } from "@/components/ui";

export default function PinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [pin, setPin] = useState<Pin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ data: Pin }>(`/pins/${id}`);
      setPin(res.data);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "This pin doesn't exist or was deleted." : errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  const patch = (p: Partial<Pin>) => setPin((cur) => (cur ? { ...cur, ...p } : cur));

  const like = async () => {
    if (!pin) return;
    if (!user) return router.push(`/login?next=/pin/${pin.id}`);
    const was = pin.is_liked;
    patch({ is_liked: !was, likes_count: pin.likes_count + (was ? -1 : 1) });
    try {
      const r = await api<{ liked: boolean; likes_count: number }>(`/pins/${pin.id}/like`, { method: was ? "DELETE" : "POST" });
      patch({ is_liked: r.liked, likes_count: r.likes_count });
    } catch (e) {
      patch({ is_liked: was, likes_count: pin.likes_count });
      toast(errorMessage(e), "error");
    }
  };

  const remove = async () => {
    if (!pin || !confirm("Delete this pin? This can't be undone.")) return;
    try {
      await api(`/pins/${pin.id}`, { method: "DELETE" });
      toast("Pin deleted");
      router.push(user ? `/${user.username}` : "/");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (error) return <ErrorState text={error} onRetry={load} />;
  if (!pin) return <Spinner className="py-24" />;

  return (
    <div>
      <button onClick={() => router.back()} aria-label="Back" className="icon-btn fixed left-[88px] top-24 z-10 hidden bg-white shadow lg:flex">
        <ArrowLeft />
      </button>
      <article className="mx-auto mb-10 flex max-w-5xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.12)] md:flex-row">
        <div className="md:w-1/2" style={{ backgroundColor: pin.dominant_color }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pin.image_url} alt={pin.title} width={pin.image_width} height={pin.image_height} className="h-auto w-full md:rounded-l-[32px]" />
        </div>
        <div className="flex flex-col p-5 md:w-1/2 md:p-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button onClick={like} aria-pressed={pin.is_liked} aria-label={pin.is_liked ? "Unlike" : "Like"} className={`icon-btn ${pin.is_liked ? "text-brand" : ""}`}>
                <HeartIcon filled={pin.is_liked} />
              </button>
              <span className="mr-2 text-sm font-semibold" aria-label="Likes">{formatCount(pin.likes_count)}</span>
              <button onClick={() => sharePin(pin, toast)} aria-label="Share" className="icon-btn"><ShareIcon /></button>
              {pin.is_owner && (
                <div className="relative">
                  <button onClick={() => setMenu(!menu)} aria-label="More options" aria-expanded={menu} className="icon-btn"><DotsIcon /></button>
                  {menu && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-2xl bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,0.18)]" role="menu">
                      <button role="menuitem" onClick={() => { setEditing(true); setMenu(false); }} className="block w-full rounded-xl px-3 py-2 text-left font-semibold hover:bg-neutral-100">Edit pin</button>
                      <button role="menuitem" onClick={remove} className="block w-full rounded-xl px-3 py-2 text-left font-semibold text-red-700 hover:bg-neutral-100">Delete pin</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <SaveMenu pin={pin} onChange={patch} />
          </div>

          {editing ? (
            <EditPin pin={pin} onDone={(p) => { if (p) patch(p); setEditing(false); }} />
          ) : (
            <>
              {pin.link && (
                <a href={pin.link} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline">
                  <LinkIcon /> {pin.link.replace(/^https?:\/\//, "").slice(0, 50)}
                </a>
              )}
              <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{pin.title}</h1>
              {pin.description && <p className="mt-3 whitespace-pre-line text-neutral-800">{pin.description}</p>}
            </>
          )}

          {pin.user && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <Link href={`/${pin.user.username}`} className="flex min-w-0 items-center gap-3">
                <Avatar user={pin.user} size={48} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{pin.user.name}</span>
                  <span className="block text-sm text-neutral-600">{formatCount(pin.user.followers_count)} followers</span>
                </span>
              </Link>
              {!pin.user.is_me && (
                <FollowButton
                  user={pin.user}
                  onChange={(following, followers) => patch({ user: { ...pin.user!, is_following: following, followers_count: followers } })}
                />
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">{formatCount(pin.saves_count)} saves · created {timeAgo(pin.created_at)} ago</p>

          <Comments pin={pin} onCount={(d) => patch({ comments_count: pin.comments_count + d })} />
        </div>
      </article>

      <h2 className="mb-4 text-center text-xl font-semibold">More to explore</h2>
      <PinGrid key={pin.id} path={`/pins/${pin.id}/related`} />
    </div>
  );
}

function EditPin({ pin, onDone }: { pin: Pin; onDone: (p?: Partial<Pin>) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: pin.title, description: pin.description ?? "", link: pin.link ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ data: Pin }>(`/pins/${pin.id}`, { method: "PATCH", body: { title: form.title, description: form.description || null, link: form.link || null } });
      toast("Pin updated");
      onDone({ title: r.data.title, description: r.data.description, link: r.data.link });
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="mt-4 flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="et">Title</label>
        <input id="et" className="input" maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        {errors.title && <p className="field-error">{errors.title}</p>}
      </div>
      <div>
        <label className="label" htmlFor="ed">Description</label>
        <textarea id="ed" className="input min-h-24" maxLength={800} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="el">Link</label>
        <input id="el" className="input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://" />
        {errors.link && <p className="field-error">{errors.link}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => onDone()}>Cancel</button>
        <button className="btn-primary" disabled={busy || !form.title.trim()}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

function Comments({ pin, onCount }: { pin: Pin; onCount: (delta: number) => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p: number) => {
    setError(null);
    try {
      const r = await api<Paginated<Comment>>(`/pins/${pin.id}/comments?page=${p}`);
      setComments((cur) => (p === 1 ? r.data : [...(cur ?? []), ...r.data]));
      setPage(r.meta.current_page);
      setLastPage(r.meta.last_page);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [pin.id]);

  useEffect(() => {
    load(1);
  }, [load, user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ data: Comment }>(`/pins/${pin.id}/comments`, { method: "POST", body: { body } });
      setComments((cur) => [r.data, ...(cur ?? [])]);
      setBody("");
      onCount(1);
    } catch (err) {
      toast(err instanceof ApiError ? err.field("body") ?? err.message : errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (c: Comment) => {
    try {
      await api(`/comments/${c.id}`, { method: "DELETE" });
      setComments((cur) => (cur ?? []).filter((x) => x.id !== c.id));
      onCount(-1);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <section className="mt-6 flex flex-1 flex-col border-t border-neutral-200 pt-4" aria-label="Comments">
      <h2 className="text-lg font-semibold">{pin.comments_count === 0 ? "No comments yet" : `${pin.comments_count} comment${pin.comments_count === 1 ? "" : "s"}`}</h2>
      {error && <ErrorState text={error} onRetry={() => load(1)} />}
      {comments === null && !error && <Spinner />}
      <ul className="mt-3 flex max-h-80 flex-col gap-4 overflow-y-auto">
        {comments?.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.user && <Link href={`/${c.user.username}`}><Avatar user={c.user} size={32} /></Link>}
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {c.user && <Link href={`/${c.user.username}`} className="mr-1 font-semibold hover:underline">{c.user.name}</Link>}
                <span className="break-words">{c.body}</span>
              </p>
              <div className="mt-0.5 flex gap-3 text-xs text-neutral-500">
                <span>{timeAgo(c.created_at)}</span>
                {c.can_delete && <button onClick={() => del(c)} className="font-semibold hover:underline">Delete</button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {page < lastPage && <button onClick={() => load(page + 1)} className="btn-secondary mt-3 self-start py-2">Show more comments</button>}
      {user ? (
        <form onSubmit={submit} className="mt-4 flex items-center gap-2">
          <Avatar user={user} size={40} />
          <label htmlFor="comment" className="sr-only">Add a comment</label>
          <input id="comment" className="input rounded-full py-2.5" placeholder="Add a comment" maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn-primary" disabled={busy || !body.trim()}>{busy ? "…" : "Post"}</button>
        </form>
      ) : (
        <p className="mt-4 text-sm"><Link href={`/login?next=/pin/${pin.id}`} className="font-semibold underline">Log in</Link> to comment.</p>
      )}
    </section>
  );
}
