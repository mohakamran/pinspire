import Link from "next/link";
import { Logo } from "./ui";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-rose-50 px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] bg-white px-6 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:px-10">
        <Link href="/" className="mx-auto mb-4 flex w-fit"><Logo withText /></Link>
        <h1 className="text-center text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-center text-neutral-600">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

