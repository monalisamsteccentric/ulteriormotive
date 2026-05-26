import { createClient } from "npm:@supabase/supabase-js";

type ControlType = "human" | "ai";
type PlayerRole = "player_a" | "player_b";

type CreateMatchInput = {
  userId?: unknown;
  role?: unknown;
  controlType?: unknown;
  waitMinutes?: unknown;
  aiStrategy?: unknown;
};

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://ulteriormotive.club",
  "https://www.ulteriormotive.club"
]);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });
  }

  try {
    const input = validateInput(await req.json());
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          error: "Supabase env missing",
          missing: [
            ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
            ...(!serviceRoleKey ? ["SERVICE_ROLE_KEY"] : [])
          ]
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const inviteCode = createInviteCode();
    const waitUntil = new Date(Date.now() + input.waitMinutes * 60_000).toISOString();
    const payload = {
      invite_code: inviteCode,
      wait_until: waitUntil,
      status: "waiting",
      player_a_user_id: input.role === "player_a" ? input.userId : null,
      player_b_user_id: input.role === "player_b" ? input.userId : null,
      player_a_control_type: input.role === "player_a" ? input.controlType : null,
      player_b_control_type: input.role === "player_b" ? input.controlType : null,
      player_a_ai_strategy: input.role === "player_a" && input.controlType === "ai" ? cleanAiStrategy(input.aiStrategy) : null,
      player_b_ai_strategy: input.role === "player_b" && input.controlType === "ai" ? cleanAiStrategy(input.aiStrategy) : null
    };

    const { data, error } = await supabase.from("matches").insert(payload).select("id, invite_code").single();
    if (error) throw error;

    return Response.json(data, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 400, headers: corsHeaders });
  }
});

function validateInput(input: CreateMatchInput) {
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const role = input.role;
  const controlType = input.controlType;
  const waitMinutes = Number(input.waitMinutes);
  const aiStrategy = typeof input.aiStrategy === "string" ? input.aiStrategy : "";

  if (!userId) throw new Error("Missing userId.");
  if (role !== "player_a" && role !== "player_b") throw new Error("Invalid role.");
  if (controlType !== "human" && controlType !== "ai") throw new Error("Invalid controlType.");
  if (![5, 30, 60].includes(waitMinutes)) throw new Error("Invalid waitMinutes.");

  return {
    userId,
    role: role as PlayerRole,
    controlType: controlType as ControlType,
    waitMinutes: waitMinutes as 5 | 30 | 60,
    aiStrategy
  };
}

function createInviteCode() {
  return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase();
}

function cleanAiStrategy(input: string) {
  const strategy = input.replace(/\s+/g, " ").trim();
  return strategy ? strategy.slice(0, 600) : null;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://ulteriormotive.club",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "content-type": "application/json"
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed";
}
