"use client";

import Link from "next/link";
import { useState } from "react";
import { PinGrid } from "@/components/PinGrid";
import { EmptyState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"all" | "following">("all");
  const path = loading ? null : tab === "following" && user ? "/pins?feed=following" : "/pins";

  return (
    <div>
      {!loading && !user && (
        <section className="mx-auto mb-6 mt-2 flex max-w-3xl flex-col items-center gap-3 rounded-3xl bg-orange-50 px-6 py-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find your next idea</h1>
          <p className="text-neutral-700">Browse freely. Sign up to save pins to boards, like, comment and follow creators.</p>
          <div className="flex gap-2">
            <Link href="/register" className="btn-primary">Join Pinspire</Link>
            <Link href="/login" className="btn-secondary">Log in</Link>
          </div>
        </section>
      )}
      {user && (
        <div className="mb-4 flex justify-center gap-2" role="tablist" aria-label="Feed">
          {(["all", "following"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
            >
              {t === "all" ? "For you" : "Following"}
            </button>
          ))}
        </div>
      )}
      <PinGrid
        key={path ?? "wait"}
        path={path}
        empty={
          tab === "following" ? (
            <EmptyState title="Nothing from people you follow yet" text="Follow creators to see their new pins here." action={<Link href="/search" className="btn-primary">Find people</Link>} />
          ) : (
            <EmptyState title="No pins yet" text="Be the first to create one." action={<Link href="/create" className="btn-primary">Create pin</Link>} />
          )
        }
      />
    </div>
  );
}
