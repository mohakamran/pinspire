"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PinGrid } from "@/components/PinGrid";
import { BoardCard } from "@/components/BoardCard";
import { FollowButton } from "@/components/FollowButton";
import { Avatar, EmptyState, ErrorState, Spinner, formatCount } from "@/components/ui";
import { useInfinite } from "@/lib/useInfinite";
import type { Board, User } from "@/lib/types";

const TOPICS = ["living room", "pasta", "garden", "travel", "outfit", "watercolor", "bread", "plants"];
const TABS = ["pins", "people", "boards"] as const;

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as (typeof TABS)[number]) : "pins";

  if (!q) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <h1 className="mb-2 text-center text-3xl font-bold">Explore ideas</h1>
        <p className="mb-6 text-center text-neutral-600">Search above, or start with a popular topic.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {TOPICS.map((t) => (
            <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="btn-secondary capitalize">{t}</Link>
          ))}
        </div>
      </div>
    );
  }

  const enc = encodeURIComponent(q);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => router.push(`/search?q=${enc}&tab=${t}`)}
            aria-pressed={tab === t}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "pins" && (
        <PinGrid key={q} path={`/search/pins?q=${enc}`} empty={<EmptyState title={`No pins found for “${q}”`} text="Try a different or broader search term." />} />
      )}
      {tab === "people" && <People q={q} />}
      {tab === "boards" && <Boards q={q} />}
    </div>
  );
}

function People({ q }: { q: string }) {
  const { items, loading, error, loaded, retry, update } = useInfinite<User>(`/search/users?q=${encodeURIComponent(q)}`, 20);
  return (
    <div className="mx-auto max-w-2xl">
      {loaded && !loading && !error && items.length === 0 && <EmptyState title={`No people found for “${q}”`} />}
      <ul className="flex flex-col gap-2">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-neutral-50">
            <Link href={`/${u.username}`} className="flex min-w-0 items-center gap-3">
              <Avatar user={u} size={56} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{u.name}</span>
                <span className="block text-sm text-neutral-600">@{u.username} · {formatCount(u.followers_count)} followers</span>
              </span>
            </Link>
            {!u.is_me && <FollowButton user={u} onChange={(f, n) => update(u.id, { is_following: f, followers_count: n })} />}
          </li>
        ))}
      </ul>
      {error && <ErrorState text={error} onRetry={retry} />}
      {loading && <Spinner />}
    </div>
  );
}

function Boards({ q }: { q: string }) {
  const { items, loading, error, loaded, retry } = useInfinite<Board>(`/search/boards?q=${encodeURIComponent(q)}`, 20);
  return (
    <div>
      {loaded && !loading && !error && items.length === 0 && <EmptyState title={`No boards found for “${q}”`} />}
      <div role="list" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((b) => <BoardCard key={b.id} board={b} showOwner />)}
      </div>
      {error && <ErrorState text={error} onRetry={retry} />}
      {loading && <Spinner />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchInner />
    </Suspense>
  );
}
