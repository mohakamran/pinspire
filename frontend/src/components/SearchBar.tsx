"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { CloseIcon, SearchIcon } from "./icons";
import { Avatar } from "./ui";

export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState<{ queries: string[]; users: User[] }>({ queries: [], users: [] });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSugg({ queries: [], users: [] });
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      api<{ queries: string[]; users: { data?: User[] } | User[] }>(`/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => setSugg({ queries: r.queries, users: Array.isArray(r.users) ? r.users : r.users.data ?? [] }))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const hasSugg = sugg.queries.length > 0 || sugg.users.length > 0;
  return (
    <div ref={box} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex h-12 items-center gap-2 rounded-full bg-neutral-100 px-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-200"
      >
        <SearchIcon className="h-5 w-5 text-neutral-500" />
        <input
          aria-label="Search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for ideas"
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-500"
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="text-neutral-500 hover:text-neutral-900">
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </form>
      {open && hasSugg && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-2xl bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,0.18)]" role="listbox">
          {sugg.queries.map((s) => (
            <button key={s} role="option" aria-selected={false} onClick={() => go(s)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-neutral-100">
              <SearchIcon className="h-4 w-4 text-neutral-500" />
              <span className="truncate">{s}</span>
            </button>
          ))}
          {sugg.users.map((u) => (
            <Link key={u.id} href={`/${u.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-neutral-100">
              <Avatar user={u} size={32} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{u.name}</span>
                <span className="block text-xs text-neutral-600">@{u.username}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
