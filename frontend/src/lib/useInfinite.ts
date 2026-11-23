"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Paginated } from "@/lib/types";

/**
 * Paginated list loader with infinite scroll. `path` may contain a query string;
 * pass null to wait (e.g. until auth resolves). Changing `path` resets the list.
 */
export function useInfinite<T extends { id: number }>(path: string | null, perPage = 24) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const reqId = useRef(0);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (p: number) => {
      if (!path) return;
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const sep = path.includes("?") ? "&" : "?";
        const res = await api<Paginated<T>>(`${path}${sep}page=${p}&per_page=${perPage}`);
        if (id !== reqId.current) return;
        setItems((prev) => {
          const base = p === 1 ? [] : prev;
          const seen = new Set(base.map((x) => x.id));
          return [...base, ...res.data.filter((x) => !seen.has(x.id))];
        });
        setPage(res.meta.current_page);
        setLastPage(res.meta.last_page);
        setTotal(res.meta.total);
      } catch (e) {
        if (id === reqId.current) setError(errorMessage(e));
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [path, perPage]
  );

  useEffect(() => {
    setItems([]);
    setPage(0);
    setTotal(null);
    if (path) load(1);
  }, [path, load]);

  const hasMore = page < lastPage;
  const loadMore = useCallback(() => {
    if (!loading && hasMore && !error) load(page + 1);
  }, [loading, hasMore, error, load, page]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const update = useCallback((id: number, patch: Partial<T>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);
  const remove = useCallback((id: number) => setItems((prev) => prev.filter((x) => x.id !== id)), []);

  return { items, loading, error, hasMore, total, loaded: page > 0, retry: () => load(page + 1 || 1), sentinel, update, remove, reload: () => load(1) };
}
