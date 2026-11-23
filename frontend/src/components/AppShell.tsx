"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { SearchBar } from "./SearchBar";
import { ChevronDown, HomeIcon, PlusIcon, SearchIcon, UserIcon } from "./icons";
import { Avatar, Logo } from "./ui";

const NO_SHELL = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (NO_SHELL.includes(pathname)) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-[72px]">
        <Header />
        <main className="px-3 pb-24 pt-2 sm:px-4 md:pb-10">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

function NavItem({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
    >
      {children}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  return (
    <nav aria-label="Main" className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col items-center gap-3 border-r border-neutral-200 bg-white py-4 md:flex">
      <Link href="/" aria-label="Pinspire home" className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl hover:bg-neutral-100">
        <Logo />
      </Link>
      <NavItem href="/" label="Home" active={pathname === "/"}>
        <HomeIcon />
      </NavItem>
      <NavItem href="/search" label="Explore" active={pathname.startsWith("/search")}>
        <SearchIcon />
      </NavItem>
      <NavItem href="/create" label="Create pin" active={pathname === "/create"}>
        <PlusIcon />
      </NavItem>
      {user && (
        <NavItem href={`/${user.username}`} label="Your profile" active={pathname === `/${user.username}`}>
          <UserIcon />
        </NavItem>
      )}
    </nav>
  );
}

function Header() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
      <Link href="/" aria-label="Pinspire home" className="md:hidden">
        <Logo />
      </Link>
      <Link href="/" className="hidden rounded-full bg-neutral-900 px-4 py-3 text-sm font-semibold text-white lg:block md:hidden">
        Home
      </Link>
      <div className="min-w-0 flex-1">
        <Suspense fallback={<div className="h-12 rounded-full bg-neutral-100" />}>
          <SearchBar />
        </Suspense>
      </div>
      {loading ? (
        <div className="h-12 w-24" />
      ) : user ? (
        <UserMenu />
      ) : (
        <div className="flex gap-2">
          <Link href="/login" className="btn-primary hidden sm:inline-flex">Log in</Link>
          <Link href="/register" className="btn-secondary">Sign up</Link>
        </div>
      )}
    </header>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  if (!user) return null;
  return (
    <div ref={ref} className="relative flex items-center">
      <Link href={`/${user.username}`} aria-label="Your profile" className="rounded-full p-1 hover:bg-neutral-100">
        <Avatar user={user} size={32} />
      </Link>
      <button onClick={() => setOpen(!open)} aria-label="Account menu" aria-expanded={open} className="rounded-full p-2 hover:bg-neutral-100">
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,0.18)]" role="menu">
          <div className="px-3 py-2 text-xs text-neutral-600">Signed in as</div>
          <Link href={`/${user.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-neutral-100">
            <Avatar user={user} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-neutral-600">{user.email}</span>
            </span>
          </Link>
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 font-semibold hover:bg-neutral-100">Edit profile</Link>
          <Link href="/create" role="menuitem" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 font-semibold hover:bg-neutral-100">Create pin</Link>
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              toast("You've been logged out");
              router.push("/");
            }}
            className="block w-full rounded-xl px-3 py-2 text-left font-semibold hover:bg-neutral-100"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/search", label: "Search", icon: <SearchIcon /> },
    { href: "/create", label: "Create", icon: <PlusIcon /> },
    { href: user ? `/${user.username}` : "/login", label: user ? "Profile" : "Log in", icon: <UserIcon /> },
  ];
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-neutral-200 bg-white py-1 md:hidden">
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link key={it.label} href={it.href} aria-label={it.label} className={`flex flex-col items-center px-4 py-1.5 text-[11px] font-medium ${active ? "text-neutral-900" : "text-neutral-500"}`}>
            {it.icon}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
