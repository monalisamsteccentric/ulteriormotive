import { ReactNode } from "react";
import Link from "next/link";
import { HeaderAccount } from "@/components/layout/HeaderAccount";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="pink-stage mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-7 sm:py-5 lg:px-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:block">
            <Link href="/" className="truncate text-2xl font-black leading-tight tracking-normal text-white">
              Ulterior Motive
            </Link>
            <div className="shrink-0 lg:hidden">
              <HeaderAccount />
            </div>
          </div>
          <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-black text-mist sm:-mx-0 sm:flex-wrap sm:px-0 sm:text-xs">
            <NavLink href="/leaderboard">Leaderboard</NavLink>
            <NavLink href="/championship">Championship</NavLink>
            <NavLink href="/monthly-final">Final</NavLink>
            <NavLink href="/past-champions">Champions</NavLink>
          </nav>
        </div>
        <div className="hidden lg:block">
          <HeaderAccount />
        </div>
      </header>
      {children}
    </main>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shrink-0 rounded-lg border border-line bg-white/10 px-3 py-2 leading-none">
      {children}
    </Link>
  );
}
