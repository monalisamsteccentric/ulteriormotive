import { ReactNode } from "react";
import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";
import { supabaseServer } from "@/lib/supabaseServer";
import { SignOutButton } from "@/components/auth/SignOutButton";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const { data: profile } = user
    ? await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };
  const displayName =
    profile?.username ??
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Profile";

  return (
    <main className="pink-stage mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-5 sm:px-7 lg:px-8">
      <header className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-normal text-white">
          Ulterior Motive
        </Link>
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="glass-pill inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white/90"
            >
              <UserRound size={14} />
              {displayName}
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="glass-pill inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white/90"
          >
            <LogIn size={14} />
            Login / Sign up
          </Link>
        )}
      </header>
      {children}
    </main>
  );
}
