"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export function FollowButton({ user, onChange }: { user: User; onChange: (following: boolean, followers: number) => void }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (me && me.id === user.id) return null;

  const toggle = async () => {
    if (!me) return router.push(`/login?next=/${user.username}`);
    setBusy(true);
    try {
      const r = await api<{ following: boolean; followers_count: number }>(`/users/${user.username}/follow`, { method: user.is_following ? "DELETE" : "POST" });
      onChange(r.following, r.followers_count);
      toast(r.following ? `Following ${user.name}` : `Unfollowed ${user.name}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={!!user.is_following} className={user.is_following ? "btn-dark" : "btn-primary"}>
      {user.is_following ? "Following" : "Follow"}
    </button>
  );
}
