import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const supabase = createRouteHandlerClient(
    {
      cookies: () => cookieStore as unknown as ReturnType<typeof cookies>
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey
    }
  );

  if (authError) {
    const url = new URL("/login", requestUrl.origin);
    url.searchParams.set("authError", authError);
    return NextResponse.redirect(url);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const url = new URL("/login", requestUrl.origin);
      url.searchParams.set("authError", error.message);
      return NextResponse.redirect(url);
    } else {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        const username =
          user.user_metadata?.name ??
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "Guest";
        await supabase.from("profiles").upsert({
          id: user.id,
          username,
          avatar_url: user.user_metadata?.avatar_url ?? null
        });
      }
    }
  } else {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const url = new URL("/login", requestUrl.origin);
      url.searchParams.set("authError", "Google sign-in could not be completed. Please try again.");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
