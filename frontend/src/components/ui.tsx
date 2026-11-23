"use client";

import Link from "next/link";
import type { User } from "@/lib/types";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-8 ${className}`} role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand" />
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
      <div className="text-xl font-semibold">{title}</div>
      {text && <p className="text-neutral-600">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-12 text-center" role="alert">
      <p className="text-red-700">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Try again
        </button>
      )}
    </div>
  );
}

export function Avatar({ user, size = 40 }: { user?: Pick<User, "name" | "avatar_url"> | null; size?: number }) {
  const initial = user?.name?.[0]?.toUpperCase() ?? "?";
  return user?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-700"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function UserLink({ user, size = 32, sub }: { user: User; size?: number; sub?: React.ReactNode }) {
  return (
    <Link href={`/${user.username}`} className="flex min-w-0 items-center gap-2 hover:underline">
      <Avatar user={user} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{user.name}</span>
        {sub && <span className="block text-xs text-neutral-600">{sub}</span>}
      </span>
    </Link>
  );
}

export function Logo({ withText = false }: { withText?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
        <circle cx="16" cy="16" r="16" className="fill-brand" />
        <path d="M11 24V9h6.2a4.6 4.6 0 0 1 0 9.2H14.4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20.5" cy="23.5" r="1.8" fill="white" />
      </svg>
      {withText && <span className="text-xl font-bold tracking-tight text-brand">Pinspire</span>}
    </span>
  );
}

export function formatCount(n: number | undefined) {
  if (n === undefined) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [604800, "w"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [sec, label] of units) if (s >= sec) return `${Math.floor(s / sec)}${label}`;
  return "now";
}
