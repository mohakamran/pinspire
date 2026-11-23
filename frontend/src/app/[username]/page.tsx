"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Board, User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PinGrid } from "@/components/PinGrid";
import { BoardCard } from "@/components/BoardCard";
import { BoardForm } from "@/components/BoardForm";
import { FollowButton } from "@/components/FollowButton";
import { Modal } from "@/components/Modal";
import { Avatar, EmptyState, ErrorState, Spinner, formatCount } from "@/components/ui";

function Profile() {
  const { username } = useParams<{ username: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { user: me } = useAuth();
  const toast = useToast();
  const tab = params.get("tab") === "created" ? "created" : "saved";
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [people, setPeople] = useState<"followers" | "following" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setUser((await api<{ data: User }>(`/users/${username}`)).data);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "We couldn't find that profile." : errorMessage(e));
    }
  }, [username]);

  const loadBoards = useCallback(async () => {
    setBoardsError(null);
    try {
      setBoards((await api<{ data: Board[] }>(`/users/${username}/boards`)).data);
    } catch (e) {
      setBoardsError(errorMessage(e));
    }
  }, [username]);

  useEffect(() => {
    load();
    loadBoards();
  }, [load, loadBoards, me?.id]);

  if (error) return <ErrorState text={error} onRetry={load} />;
  if (!user) return <Spinner className="py-24" />;

  return (
    <div>
      <header className="mx-auto flex max-w-xl flex-col items-center gap-2 py-6 text-center">
        <Avatar user={user} size={120} />
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{user.name}</h1>
        <p className="text-neutral-600">@{user.username}</p>
        {user.bio && <p className="max-w-md">{user.bio}</p>}
        {user.website && (
          <a href={user.website} target="_blank" rel="noopener noreferrer nofollow" className="text-sm font-semibold underline">{user.website.replace(/^https?:\/\//, "")}</a>
        )}
        <p className="text-sm font-semibold">
          <button onClick={() => setPeople("followers")} className="hover:underline">{formatCount(user.followers_count)} followers</button>
          {" · "}
          <button onClick={() => setPeople("following")} className="hover:underline">{formatCount(user.following_count)} following</button>
        </p>
        <div className="mt-2 flex gap-2">
          <button
            className="btn-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast("Profile link copied");
              } catch {
                toast("Couldn't copy the link", "error");
              }
            }}
          >
            Share
          </button>
          {user.is_me ? (
            <Link href="/settings" className="btn-secondary">Edit profile</Link>
          ) : (
            <FollowButton user={user} onChange={(f, n) => setUser({ ...user, is_following: f, followers_count: n })} />
          )}
        </div>
      </header>

      <nav className="mb-6 flex justify-center gap-6 border-b border-neutral-100" aria-label="Profile sections">
        {(["created", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => router.replace(`/${username}?tab=${t}`)}
            aria-current={tab === t ? "page" : undefined}
            className={`border-b-[3px] px-2 pb-2 font-semibold capitalize ${tab === t ? "border-neutral-900" : "border-transparent text-neutral-600"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "created" ? (
        <PinGrid
          key={`created-${username}`}
          path={`/users/${username}/pins`}
          empty={
            <EmptyState
              title={user.is_me ? "You haven't created any pins yet" : `${user.name} hasn't created any pins yet`}
              action={user.is_me ? <Link href="/create" className="btn-primary">Create pin</Link> : undefined}
            />
          }
        />
      ) : (
        <section>
          {user.is_me && (
            <div className="mb-4 flex justify-end">
              <button className="btn-primary" onClick={() => setCreating(true)}>+ Create board</button>
            </div>
          )}
          {boardsError && <ErrorState text={boardsError} onRetry={loadBoards} />}
          {!boards && !boardsError && <Spinner />}
          {boards?.length === 0 && (
            <EmptyState title={user.is_me ? "Organise your ideas into boards" : "No boards yet"} text={user.is_me ? "Create a board, then save pins to it." : undefined} />
          )}
          <div role="list" className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {boards?.map((b) => <BoardCard key={b.id} board={b} />)}
          </div>
        </section>
      )}

      {creating && (
        <Modal title="Create board" onClose={() => setCreating(false)}>
          <BoardForm
            onCancel={() => setCreating(false)}
            onSaved={(b) => {
              setCreating(false);
              toast(`Board “${b.name}” created`);
              loadBoards();
            }}
          />
        </Modal>
      )}
      {people && <PeopleModal username={username} kind={people} onClose={() => setPeople(null)} />}
    </div>
  );
}

function PeopleModal({ username, kind, onClose }: { username: string; kind: "followers" | "following"; onClose: () => void }) {
  const [list, setList] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ data: User[] }>(`/users/${username}/${kind}`).then((r) => setList(r.data)).catch((e) => setError(errorMessage(e)));
  }, [username, kind]);
  return (
    <Modal title={kind === "followers" ? "Followers" : "Following"} onClose={onClose}>
      {error && <p className="text-red-700">{error}</p>}
      {!list && !error && <Spinner />}
      {list?.length === 0 && <p className="text-neutral-600">Nobody here yet.</p>}
      <ul className="flex flex-col gap-2">
        {list?.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3">
            <Link href={`/${u.username}`} onClick={onClose} className="flex items-center gap-3">
              <Avatar user={u} size={44} />
              <span><span className="block font-semibold">{u.name}</span><span className="text-sm text-neutral-600">@{u.username}</span></span>
            </Link>
            {!u.is_me && <FollowButton user={u} onChange={(f) => setList((cur) => cur?.map((x) => (x.id === u.id ? { ...x, is_following: f } : x)) ?? null)} />}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Profile />
    </Suspense>
  );
}
