import Link from "next/link";
import type { Board } from "@/lib/types";
import { LockIcon } from "./icons";
import { timeAgo } from "./ui";

/** Board collage cover: one large image plus two stacked small ones. */
export function BoardCard({ board, showOwner = false }: { board: Board; showOwner?: boolean }) {
  const [a, b, c] = board.cover_images ?? [];
  const owner = board.user?.username ?? "";
  return (
    <Link href={`/${owner}/${board.slug}`} className="group block" role="listitem">
      <div className="grid aspect-[3/2] grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-neutral-100 transition group-hover:opacity-90">
        <Cover src={a} className="col-span-2 row-span-2" />
        <Cover src={b} className="" />
        <Cover src={c} className="" />
      </div>
      <div className="px-1 pt-2">
        <div className="flex items-center gap-1 truncate font-semibold">
          {board.name} {board.is_private && <LockIcon className="h-3.5 w-3.5 shrink-0" />}
        </div>
        <div className="text-xs text-neutral-600">
          {showOwner && board.user ? `${board.user.name} · ` : ""}
          {board.pins_count ?? 0} Pins · {timeAgo(board.updated_at)}
        </div>
      </div>
    </Link>
  );
}

function Cover({ src, className }: { src?: string; className: string }) {
  return (
    <div className={`bg-neutral-200 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </div>
  );
}
