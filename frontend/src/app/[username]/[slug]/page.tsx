"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Board } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PinGrid } from "@/components/PinGrid";
import { BoardForm } from "@/components/BoardForm";
import { Modal } from "@/components/Modal";
import { CloseIcon, LockIcon } from "@/components/icons";
import { Avatar, EmptyState, ErrorState, Spinner } from "@/components/ui";

export default function BoardPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      setBoard((await api<{ data: Board }>(`/users/${username}/boards/${slug}`)).data);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "This board doesn't exist or is secret." : errorMessage(e));
    }
  }, [username, slug]);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  const del = async () => {
    if (!board || !confirm(`Delete “${board.name}”? Pins stay on Pinspire; only this board is removed.`)) return;
    try {
      await api(`/boards/${board.id}`, { method: "DELETE" });
      toast("Board deleted");
      router.push(`/${username}?tab=saved`);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (error) return <ErrorState text={error} onRetry={load} />;
  if (!board) return <Spinner className="py-24" />;

  return (
    <div>
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-6 text-center">
        <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
          {board.name} {board.is_private && <LockIcon className="h-6 w-6" />}
        </h1>
        {board.description && <p className="text-neutral-700">{board.description}</p>}
        {board.user && (
          <Link href={`/${board.user.username}`} className="flex items-center gap-2 text-sm hover:underline">
            <Avatar user={board.user} size={28} /> <span>by <b>{board.user.name}</b></span>
          </Link>
        )}
        <p className="text-sm text-neutral-600">{board.pins_count ?? 0} Pins</p>
        {board.is_owner && (
          <div className="mt-2 flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing(true)}>Edit board</button>
            <button className="btn-secondary text-red-700" onClick={del}>Delete board</button>
          </div>
        )}
      </header>

      <PinGrid
        key={`${board.id}-${version}`}
        path={`/boards/${board.id}/pins`}
        empty={<EmptyState title="No pins on this board yet" text={board.is_owner ? "Use the Save button on any pin to add it here." : undefined} action={board.is_owner ? <Link href="/" className="btn-primary">Find ideas</Link> : undefined} />}
        cardAction={
          board.is_owner
            ? (pin, remove) => (
                <button
                  aria-label="Remove from board"
                  title="Remove from board"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await api(`/boards/${board.id}/pins/${pin.id}`, { method: "DELETE" });
                      remove();
                      setBoard({ ...board, pins_count: Math.max(0, (board.pins_count ?? 1) - 1) });
                      toast(`Removed from ${board.name}`);
                    } catch (err) {
                      toast(errorMessage(err), "error");
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 hover:bg-white"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              )
            : undefined
        }
      />

      {editing && (
        <Modal title="Edit board" onClose={() => setEditing(false)}>
          <BoardForm
            board={board}
            onCancel={() => setEditing(false)}
            onSaved={(b) => {
              setEditing(false);
              toast("Board updated");
              if (b.slug !== board.slug) router.replace(`/${username}/${b.slug}`);
              else {
                setBoard({ ...board, ...b });
                setVersion((v) => v + 1);
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
