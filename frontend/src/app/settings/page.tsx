"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Avatar, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", username: "", bio: "", website: "" });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/settings");
    if (user) setForm({ name: user.name, username: user.username, bio: user.bio ?? "", website: user.website ?? "" });
  }, [loading, user, router]);

  if (loading || !user) return <Spinner className="py-24" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("username", form.username);
    fd.append("bio", form.bio);
    fd.append("website", form.website);
    if (avatar) fd.append("avatar", avatar);
    try {
      const r = await api<{ data: { username: string } }>("/me", { method: "POST", body: fd });
      await refresh();
      toast("Profile saved");
      router.push(`/${r.data.username}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-6">
      <h1 className="text-3xl font-bold">Edit profile</h1>
      <p className="mb-6 text-neutral-600">People visiting your profile will see this information.</p>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex items-center gap-4">
          <Avatar user={{ name: form.name, avatar_url: preview ?? user.avatar_url }} size={80} />
          <label className="btn-secondary cursor-pointer">
            Change photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatar(f); setPreview(URL.createObjectURL(f)); } }} />
          </label>
        </div>
        {errors.avatar && <p className="field-error">{errors.avatar}</p>}
        {(["name", "username", "website"] as const).map((k) => (
          <div key={k}>
            <label htmlFor={k} className="label capitalize">{k}</label>
            <input id={k} className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={k === "website" ? "https://" : undefined} />
            {errors[k] && <p className="field-error">{errors[k]}</p>}
          </div>
        ))}
        <div>
          <label htmlFor="bio" className="label">About</label>
          <textarea id="bio" className="input min-h-24" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell your story" />
          {errors.bio && <p className="field-error">{errors.bio}</p>}
        </div>
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
