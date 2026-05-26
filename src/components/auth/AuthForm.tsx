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
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"login" | "signup" | "google" | "resend" | null>(null);

  function confirmationRedirectUrl() {
    return `${window.location.origin}/auth/callback?next=/auth/sync`;
  }

  async function auth(mode: "login" | "signup") {
    setError("");
    setMessage("");
    setPending(mode);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      setPending(null);
      return;
    }

    const supabase = supabaseClient();
    const trimmedUsername = username.trim() || "Guest";
    localStorage.setItem("hidden_username", trimmedUsername);

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      : await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: trimmedUsername },
          emailRedirectTo: confirmationRedirectUrl()
        }
      });

    if (result.error) {
      setError(result.error.message);
      setPending(null);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Confirmation email sent. Check inbox/spam, or resend it below.");
      setPending(null);
      return;
    }

    const user = result.data.user;
    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, username: trimmedUsername, avatar_url: null });

      if (profileError) {
        setError(profileError.message);
        setPending(null);
        return;
      }

      localStorage.setItem("hidden_user_id", user.id);
      localStorage.setItem("hidden_username", trimmedUsername);
    }

    window.location.replace("/");
  }

  async function resendConfirmation() {
    setError("");
    setMessage("");
    setPending("resend");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Enter your email first.");
      setPending(null);
      return;
    }

    const supabase = supabaseClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: confirmationRedirectUrl()
      }
    });

    if (resendError) {
      setError(resendError.message);
      setPending(null);
      return;
    }

    setMessage("Confirmation email sent again. Check inbox and spam.");
    setPending(null);
  }

  async function googleAuth() {
    const supabase = supabaseClient();
    setError("");
    setMessage("");
    setPending("google");
    localStorage.setItem("hidden_username", username.trim() || "Guest");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/sync`
      }
    });
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  function guest() {
    const id = localStorage.getItem("hidden_user_id") ?? crypto.randomUUID();
    localStorage.setItem("hidden_user_id", id);
    localStorage.setItem("hidden_username", username.trim() || "Guest");
    window.location.replace("/");
  }

  return (
    <div className="space-y-3">
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-base outline-none focus:border-neon" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-base outline-none focus:border-neon" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-base outline-none focus:border-neon" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      {error ? <p className="text-base font-bold text-shock sm:text-sm">{error}</p> : null}
      {message ? <p className="text-base font-bold text-neon sm:text-sm">{message}</p> : null}
      {message ? (
        <Button className="w-full" variant="ghost" onClick={resendConfirmation} disabled={Boolean(pending)}>
          {pending === "resend" ? "Sending..." : "Resend confirmation email"}
        </Button>
      ) : null}
      <Button className="w-full gap-2" variant="ghost" onClick={googleAuth} disabled={Boolean(pending)}>
        <Chrome size={18} />
        {pending === "google" ? "Connecting..." : "Continue with Google"}
      </Button>
      <Button className="w-full" onClick={() => auth("login")} disabled={Boolean(pending)}>{pending === "login" ? "Logging in..." : "Log in"}</Button>
      <Button className="w-full" variant="ghost" onClick={() => auth("signup")} disabled={Boolean(pending)}>{pending === "signup" ? "Signing up..." : "Sign up"}</Button>
      <Button className="w-full" variant="ghost" onClick={guest} disabled={Boolean(pending)}>Continue as guest</Button>
    </div>
  );
}
