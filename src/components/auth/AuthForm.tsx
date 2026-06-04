"use client";

import { useEffect, useState } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

export function AuthForm() {
  const [username, setUsername] = useState("Guest");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"google" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (authError) setError(authError);
  }, []);

  async function googleAuth() {
    const supabase = supabaseClient();
    setError("");
    setPending("google");
    localStorage.setItem("hidden_username", username.trim() || "Guest");
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      window.location.replace("/");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/sync`,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-base outline-none focus:border-neon" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      {error ? <p className="text-base font-bold text-shock sm:text-sm">{error}</p> : null}
      <Button className="w-full gap-2" variant="ghost" onClick={googleAuth} disabled={Boolean(pending)}>
        <Chrome size={18} />
        {pending === "google" ? "Connecting..." : "Continue with Google"}
      </Button>
    </div>
  );
}
