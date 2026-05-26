import { NextResponse } from "next/server";

export async function callMatchEdgeFunction(action: string, payload: Record<string, unknown> = {}) {
  return callEdgeFunction("match-api", { action, ...payload });
}

export async function callEdgeFunction(functionName: string, payload: Record<string, unknown> = {}) {
  const { response, result } = await invokeEdgeFunction(functionName, payload);

  if (!response.ok) {
    const isMissingFunction = response.status === 404 || result?.code === "NOT_FOUND";
    return NextResponse.json(
      result ?? {
        error: isMissingFunction ? `Edge Function not deployed: ${functionName}` : "Edge Function call failed",
        functionName
      },
      { status: response.status }
    );
  }

  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" }
  });
}

export async function callMatchEdgeFunctionJson<T>(action: string, payload: Record<string, unknown> = {}) {
  return callEdgeFunctionJson<T>("match-api", { action, ...payload });
}

export async function callEdgeFunctionJson<T>(functionName: string, payload: Record<string, unknown> = {}) {
  const { response, result } = await invokeEdgeFunction(functionName, payload);
  if (!response.ok) {
    const isMissingFunction = response.status === 404 || result?.code === "NOT_FOUND";
    throw new Error(result?.error ?? (isMissingFunction ? `Edge Function not deployed: ${functionName}` : "Edge Function call failed"));
  }
  return result as T;
}

async function invokeEdgeFunction(functionName: string, payload: Record<string, unknown>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: new Response(null, { status: 500 }),
      result: {
        error: "Supabase env missing",
        missing: [
          ...(!supabaseUrl ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
          ...(!supabaseAnonKey ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] : [])
        ]
      }
    };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const result = await response.json().catch(() => null);
  return { response, result };
}
