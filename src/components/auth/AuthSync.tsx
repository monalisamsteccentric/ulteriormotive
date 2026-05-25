"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    async function syncUser() {
      const supabase = supabaseClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (user) {
        const username =
          localStorage.getItem("hidden_username") ||
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Guest";
        localStorage.setItem("hidden_user_id", user.id);
        localStorage.setItem("hidden_username", username);
      }

      router.replace("/");
    }

    syncUser();
  }, [router]);

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <p className="text-sm font-bold text-mist">Signing you in...</p>
    </section>
  );
}
