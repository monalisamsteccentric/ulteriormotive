import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const missing = [
      ...(!supabaseUrl ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
      ...(!supabaseAnonKey ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] : [])
    ];

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        {
          error: "Supabase env missing",
          message: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required to call the create-match Edge Function.",
          missing
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const response = await fetch(`${supabaseUrl}/functions/v1/create-match`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(result ?? { error: "Create match failed." }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
