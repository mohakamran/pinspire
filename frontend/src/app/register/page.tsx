"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";

const FIELDS = [
  { name: "name", label: "Name", type: "text", auto: "name" },
  { name: "username", label: "Username", type: "text", auto: "username" },
  { name: "email", label: "Email", type: "email", auto: "email" },
  { name: "password", label: "Password (8+ characters)", type: "password", auto: "new-password" },
] as const;

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await register(form);
      router.push(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      } else {
        setErrors({ form: errorMessage(err) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Join Pinspire" subtitle="Save ideas you love to your own boards">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="label">{f.label}</label>
            <input
              id={f.name}
              type={f.type}
              autoComplete={f.auto}
              className="input"
              value={form[f.name]}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              aria-invalid={!!errors[f.name]}
            />
            {errors[f.name] && <p className="field-error">{errors[f.name]}</p>}
          </div>
        ))}
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        <button className="btn-primary mt-2 py-3" disabled={busy}>{busy ? "Creating account…" : "Continue"}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already a member? <Link href="/login" className="font-semibold underline">Log in</Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
