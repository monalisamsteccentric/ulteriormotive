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
      const savedLocalName = localName && localName !== "Guest" ? localName : null;

      if (!user) {
        setAccount(savedLocalName ? { signedIn: false, displayName: savedLocalName } : null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      const displayName =
        profile?.username ||
        savedLocalName ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Profile";

      localStorage.setItem("hidden_username", displayName);
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
          className="glass-pill inline-flex min-h-11 max-w-[10rem] items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-white/90 sm:min-h-10 sm:max-w-none sm:text-xs"
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
      className="glass-pill inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-white/90 sm:min-h-10 sm:text-xs"
    >
      <LogIn size={14} />
      Login / Sign up
    </Link>
  );
}
