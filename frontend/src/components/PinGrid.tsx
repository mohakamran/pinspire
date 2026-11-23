"use client";

import { useInfinite } from "@/lib/useInfinite";
import type { Pin } from "@/lib/types";
import { Masonry } from "./Masonry";
import { PinCard } from "./PinCard";
import { EmptyState, ErrorState, Spinner } from "./ui";

/** Infinite masonry of pins for any paginated pin endpoint. */
export function PinGrid({
  path,
  empty,
  cardAction,
}: {
  path: string | null;
  empty?: React.ReactNode;
  cardAction?: (pin: Pin, remove: () => void) => React.ReactNode;
}) {
  const { items, loading, error, hasMore, loaded, retry, sentinel, update, remove } = useInfinite<Pin>(path);

  return (
    <div>
      {items.length > 0 && (
        <Masonry
          items={items}
          render={(pin, width) => (
            <PinCard pin={pin} width={width} onChange={(patch) => update(pin.id, patch)} extraAction={cardAction?.(pin, () => remove(pin.id))} />
          )}
        />
      )}
      {loaded && !loading && !error && items.length === 0 && (empty ?? <EmptyState title="No pins here yet" />)}
      {error && <ErrorState text={error} onRetry={retry} />}
      {loading && <Spinner />}
      {hasMore && !error && <div ref={sentinel} className="h-px" />}
      {loaded && !hasMore && items.length > 0 && <p className="py-8 text-center text-sm text-neutral-500">You&apos;ve reached the end</p>}
    </div>
  );
}
