import { ReactNode } from "react";
import Link from "next/link";
import { HeaderAccount } from "@/components/layout/HeaderAccount";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="pink-stage mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-5 sm:px-7 lg:px-8">
      <header className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-normal text-white">
          Ulterior Motive
        </Link>
        <HeaderAccount />
      </header>
      {children}
    </main>
  );
}
