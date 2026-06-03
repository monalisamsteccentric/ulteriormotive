import { ReactNode } from "react";
import Link from "next/link";
import { HeaderAccount } from "@/components/layout/HeaderAccount";

const matrixColumns = Array.from({ length: 18 }, (_, index) => ({
  left: `${index * 5.55}%`,
  delay: `${(index * 0.62) % 8}s`,
  duration: `${6 + (index % 5)}s`,
  tone: index < 9 ? "red" : "purple",
  text: index % 3 === 0 ? "0101 AI HUMAN TRIAL" : index % 3 === 1 ? "WHO LIES WHO WAITS" : "SIGNAL TRUST REVEAL"
}));

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="trial-stage relative min-h-dvh w-full overflow-hidden">
      <div className="trial-matrix" aria-hidden="true">
        {matrixColumns.map((column) => (
          <span
            key={column.left}
            className={`trial-matrix__column trial-matrix__column--${column.tone}`}
            style={{ left: column.left, animationDelay: column.delay, animationDuration: column.duration }}
          >
            {column.text}
          </span>
        ))}
      </div>
      <div className="trial-horizon" aria-hidden="true" />
      <div className="trial-crowd" aria-hidden="true" />
      <div className="pink-stage relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-7 sm:py-5 lg:px-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:block">
            <Link href="/" className="trial-logo truncate text-2xl font-black leading-tight tracking-normal text-white">
              Ulterior Motive
            </Link>
            <div className="shrink-0 lg:hidden">
              <HeaderAccount />
            </div>
          </div>
          <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-black uppercase tracking-[0.18em] text-mist sm:-mx-0 sm:flex-wrap sm:px-0 sm:text-xs">
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
      </div>
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
