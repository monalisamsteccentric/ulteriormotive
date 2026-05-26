"use client";

import { LogOut } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";

export function SignOutButton() {
  async function signOut() {
    const supabase = supabaseClient();
    await supabase.auth.signOut();
    localStorage.removeItem("hidden_user_id");
    localStorage.removeItem("hidden_username");
    window.location.replace("/");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      aria-label="Sign out"
      className="glass-pill grid min-h-11 w-11 place-items-center rounded-full text-white/90 sm:min-h-10 sm:w-10"
    >
      <LogOut size={14} />
    </button>
  );
}
