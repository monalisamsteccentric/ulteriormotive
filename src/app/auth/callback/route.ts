import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
