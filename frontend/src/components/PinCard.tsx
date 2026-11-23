"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Pin } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { SaveMenu } from "./SaveMenu";
import { HeartIcon, LinkIcon, ShareIcon } from "./icons";
import { Avatar } from "./ui";

export async function sharePin(pin: Pin, toast: (t: string, tone?: "ok" | "error") => void) {
  const url = `${window.location.origin}/pin/${pin.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: pin.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("Link copied to clipboard");
  } catch (e) {
    if ((e as Error).name !== "AbortError") toast("Couldn't copy the link", "error");
  }
}

export function PinCard({ pin, width, onChange, extraAction }: { pin: Pin; width: number; onChange: (patch: Partial<Pin>) => void; extraAction?: React.ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [liking, setLiking] = useState(false);
  const imgHeight = width * (pin.image_height / Math.max(1, pin.image_width));

  const like = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return router.push(`/login?next=${encodeURIComponent(`/pin/${pin.id}`)}`);
    setLiking(true);
    const was = pin.is_liked;
    onChange({ is_liked: !was, likes_count: pin.likes_count + (was ? -1 : 1) });
    try {
      const res = await api<{ liked: boolean; likes_count: number }>(`/pins/${pin.id}/like`, { method: was ? "DELETE" : "POST" });
      onChange({ is_liked: res.liked, likes_count: res.likes_count });
    } catch (err) {
      onChange({ is_liked: was, likes_count: pin.likes_count });
      toast(errorMessage(err), "error");
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="group">
      <div className="relative overflow-hidden rounded-2xl" style={{ height: imgHeight, backgroundColor: pin.dominant_color }}>
        <Link href={`/pin/${pin.id}`} aria-label={pin.title} className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pin.image_url} alt={pin.title} loading="lazy" width={pin.image_width} height={pin.image_height} className="h-full w-full object-cover" />
        </Link>
        {/* hover overlay (always visible for keyboard focus; hidden on touch until tap) */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-focus-within:bg-black/30 group-hover:bg-black/30" />
        <div className="absolute right-3 top-3 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          <SaveMenu pin={pin} onChange={onChange} compact />
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          {pin.link ? (
            <a href={pin.link} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()} className="flex max-w-[60%] items-center gap-1 truncate rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold hover:bg-white">
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{safeHost(pin.link)}</span>
            </a>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {extraAction}
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sharePin(pin, toast); }} aria-label="Share" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 hover:bg-white">
              <ShareIcon className="h-4 w-4" />
            </button>
            <button onClick={like} disabled={liking} aria-pressed={pin.is_liked} aria-label={pin.is_liked ? "Unlike" : "Like"} className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 hover:bg-white ${pin.is_liked ? "text-brand" : ""}`}>
              <HeartIcon className="h-4 w-4" filled={pin.is_liked} />
            </button>
          </div>
        </div>
      </div>
      <div className="px-1 pt-2" style={{ height: 48 }}>
        <Link href={`/pin/${pin.id}`} className="line-clamp-1 text-sm font-semibold">{pin.title}</Link>
        {pin.user && (
          <Link href={`/${pin.user.username}`} className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-700 hover:underline">
            <Avatar user={pin.user} size={18} />
            <span className="truncate">{pin.user.name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
