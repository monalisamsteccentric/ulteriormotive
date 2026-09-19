"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let instance: SupabaseClient | undefined;
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
export function browser() {
  if (!configured())
    throw new Error(
      "The experience is not configured yet. Please try again later.",
    );
  return (instance ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  ));
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = configured()
    ? (await browser().auth.getSession()).data.session
    : null;
  const headers = new Headers(options.headers);
  if (session) headers.set("Authorization", "Bearer " + session.access_token);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch("/api/" + path, {
    ...options,
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}
