"use client";

import { useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export function AuthSync() {
  useEffect(() => {
    async function syncUser() {
      const supabase = supabaseClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (user) {
        const storedUsername = localStorage.getItem("hidden_username")?.trim();
        const metadataUsername = user.user_metadata?.name || user.user_metadata?.full_name;
        const username =
          storedUsername && storedUsername !== "Guest"
            ? storedUsername
            : metadataUsername ||
          user.email?.split("@")[0] ||
          "Guest";
        await supabase.from("profiles").upsert({
          id: user.id,
          username,
          avatar_url: user.user_metadata?.avatar_url ?? null
        });
        localStorage.setItem("hidden_user_id", user.id);
        localStorage.setItem("hidden_username", username);
      }

      window.location.replace("/");
    }

    syncUser();
  }, []);

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <p className="text-sm font-bold text-mist">Signing you in...</p>
    </section>
  );
}
