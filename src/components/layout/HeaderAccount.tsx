"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, UserRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { supabaseClient } from "@/lib/supabaseClient";

type AccountState = {
  signedIn: boolean;
  displayName: string;
};

export function HeaderAccount() {
  const [account, setAccount] = useState<AccountState | null>(null);

  useEffect(() => {
    const supabase = supabaseClient();

    async function loadAccount() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const localName = localStorage.getItem("hidden_username")?.trim();

      if (!user) {
        setAccount(localName ? { signedIn: false, displayName: localName } : null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      const displayName =
        localName ||
        profile?.username ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Profile";

      setAccount({ signedIn: true, displayName });
    }

    loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadAccount();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="glass-pill inline-flex min-h-10 max-w-[11rem] items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-white/90 sm:max-w-none sm:text-xs"
        >
          <UserRound size={14} />
          <span className="truncate">{account.displayName}</span>
        </Link>
        <SignOutButton />
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="glass-pill inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-white/90 sm:text-xs"
    >
      <LogIn size={14} />
      Login / Sign up
    </Link>
  );
}
