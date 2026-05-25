"use client";

import { useState } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/common/Button";
import { supabaseClient } from "@/lib/supabaseClient";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("Guest");
  const [error, setError] = useState("");

  async function auth(mode: "login" | "signup") {
    const supabase = supabaseClient();
    const trimmedUsername = username.trim() || "Guest";
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { name: trimmedUsername } } });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    const user = result.data.user;
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, username: trimmedUsername, avatar_url: null });
      localStorage.setItem("hidden_user_id", user.id);
      localStorage.setItem("hidden_username", trimmedUsername);
    }
    window.location.replace("/");
  }

  async function googleAuth() {
    const supabase = supabaseClient();
    setError("");
    localStorage.setItem("hidden_username", username.trim() || "Guest");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/sync`
      }
    });
    if (error) setError(error.message);
  }

  function guest() {
    const id = localStorage.getItem("hidden_user_id") ?? crypto.randomUUID();
    localStorage.setItem("hidden_user_id", id);
    localStorage.setItem("hidden_username", username.trim() || "Guest");
    window.location.replace("/");
  }

  return (
    <div className="space-y-3">
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-neon" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-neon" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-neon" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      {error ? <p className="text-sm font-bold text-shock">{error}</p> : null}
      <Button className="w-full gap-2" variant="ghost" onClick={googleAuth}>
        <Chrome size={18} />
        Continue with Google
      </Button>
      <Button className="w-full" onClick={() => auth("login")}>Log in</Button>
      <Button className="w-full" variant="ghost" onClick={() => auth("signup")}>Sign up</Button>
      <Button className="w-full" variant="ghost" onClick={guest}>Continue as guest</Button>
    </div>
  );
}
