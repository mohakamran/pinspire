"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await login(email, password);
      router.push(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      setErrors(err instanceof ApiError ? { email: err.field("email"), password: err.field("password"), form: err.field("email") || err.field("password") ? undefined : err.message } : { form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to see more ideas">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        <button className="btn-primary mt-2 py-3" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        Not on Pinspire yet? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold underline">Sign up</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
