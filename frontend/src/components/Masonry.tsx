"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const GAP = 16;
const CAPTION = 56; // reserved height under each image for title/author

/** Column count by container width (mobile 2, tablet 3–4, desktop up to 7). */
function columnsFor(width: number) {
  if (width < 500) return 2;
  if (width < 760) return 3;
  if (width < 1020) return 4;
  if (width < 1300) return 5;
  if (width < 1580) return 6;
  return 7;
}

type Item = { id: number; image_width: number; image_height: number };

/**
 * JS masonry: each item goes into the currently shortest column. Heights are known up front
 * from image dimensions, so positions are stable and no reflow happens when images load.
 */
export function Masonry<T extends Item>({ items, render }: { items: T[]; render: (item: T, width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = columnsFor(width || 1200);
  const colWidth = width ? (width - GAP * (cols - 1)) / cols : 0;
  const heights = new Array(cols).fill(0);
  const positions = items.map((item) => {
    const h = colWidth * (item.image_height / Math.max(1, item.image_width)) + CAPTION;
    const col = heights.indexOf(Math.min(...heights));
    const pos = { x: col * (colWidth + GAP), y: heights[col], h };
    heights[col] += h + GAP;
    return pos;
  });

  return (
    <div ref={ref} role="list" className="relative w-full" style={{ height: Math.max(0, Math.max(...heights) - GAP) }}>
      {width > 0 &&
        items.map((item, i) => (
          <div
            key={item.id}
            role="listitem"
            className="absolute left-0 top-0"
            style={{ width: colWidth, transform: `translate(${positions[i].x}px, ${positions[i].y}px)` }}
          >
            {render(item, colWidth)}
          </div>
        ))}
    </div>
  );
}
