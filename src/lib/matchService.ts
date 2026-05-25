import { ControlType, Message, PlayerRole, PrivateMatch, PublicMatch, RevealStats } from "@/types/database";
import { createAiReplyResult, replyDelayMs } from "./aiPlayer";
import { supabaseAdmin } from "./supabaseServer";
import { cleanMessage, createInviteCode, validateMessage } from "./utils";

const aiTurnLocks = new Map<string, Promise<unknown>>();
const MIN_REVEAL_MS = 2 * 60 * 1000;

async function withAiTurnLock<T>(matchId: string, task: () => Promise<T>) {
  const current = aiTurnLocks.get(matchId);
  if (current) return null;

  const next = task();
  aiTurnLocks.set(matchId, next);
  try {
    return await next;
  } finally {
    if (aiTurnLocks.get(matchId) === next) aiTurnLocks.delete(matchId);
  }
}

export async function createMatch(input: {
  userId: string;
  role: PlayerRole;
  controlType: ControlType;
  waitMinutes: 5 | 30 | 60;
  aiStrategy?: string;
}) {
  const supabase = supabaseAdmin();
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
  return data as { id: string; invite_code: string };
}

export async function joinMatch(input: { inviteCode: string; userId: string; controlType: ControlType; aiStrategy?: string }) {
  const supabase = supabaseAdmin();
  const { data: match, error } = await supabase.from("matches").select("*").eq("invite_code", input.inviteCode).single();
  if (error) throw error;
  if (!match) throw new Error("Match not found.");
  if (match.player_a_user_id && match.player_b_user_id) throw new Error("Match is full.");

  const joiningA = !match.player_a_user_id;
  const update = joiningA
    ? {
        player_a_user_id: input.userId,
        player_a_control_type: input.controlType,
        player_a_ai_strategy: input.controlType === "ai" ? cleanAiStrategy(input.aiStrategy) : null,
        status: "waiting"
      }
    : {
        player_b_user_id: input.userId,
        player_b_control_type: input.controlType,
        player_b_ai_strategy: input.controlType === "ai" ? cleanAiStrategy(input.aiStrategy) : null,
        status: "waiting"
      };

  const { data, error: updateError } = await supabase
    .from("matches")
    .update(update)
    .eq("id", match.id)
    .select("*")
    .single();
  if (updateError) throw updateError;
  return data as { id: string; invite_code: string };
}

export async function enterMatchRoom(input: { matchId: string; userId: string }) {
  const supabase = supabaseAdmin();
  const { data: match, error } = await supabase.from("matches").select("*").eq("id", input.matchId).single();
  if (error) throw error;
  if (!match) throw new Error("Match not found.");

  const privateMatch = match as PrivateMatch;
  const enteredAt = new Date().toISOString();
  const update =
    input.userId === privateMatch.player_a_user_id
      ? { player_a_entered_at: privateMatch.player_a_entered_at ?? enteredAt }
      : input.userId === privateMatch.player_b_user_id
        ? { player_b_entered_at: privateMatch.player_b_entered_at ?? enteredAt }
        : null;

  if (!update) return privateMatch;

  const { data: updated, error: updateError } = await supabase
    .from("matches")
    .update(update)
    .eq("id", input.matchId)
    .select("*")
    .single();
  if (updateError) throw updateError;

  return startMatchIfReady(updated as PrivateMatch);
}

export async function injectAiIfExpired(matchId: string) {
  const supabase = supabaseAdmin();
  const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (error) throw error;
  if (!match || match.status !== "waiting" || new Date(match.wait_until).getTime() > Date.now()) return;

  const update = !match.player_a_user_id
    ? { player_a_control_type: "ai", status: "live" }
    : { player_b_control_type: "ai", status: "live" };

  await supabase.from("matches").update(update).eq("id", matchId);
}

export async function sendMessage(input: {
  matchId: string;
  senderRole: Message["sender_role"];
  senderUserId: string | null;
  message: string;
  isAiGenerated?: boolean;
}) {
  const result = validateMessage(input.message);
  if (!result.ok) throw new Error(result.error);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: input.matchId,
      sender_role: input.senderRole,
      sender_user_id: input.senderUserId,
      message: cleanMessage(input.message),
      is_ai_generated: Boolean(input.isAiGenerated)
    })
    .select("id, match_id, sender_role, sender_user_id, message, created_at")
    .single();

  if (error) throw error;
  const channel = supabase.channel(`messages:${input.matchId}`);
  await channel.subscribe();
  await channel.send({ type: "broadcast", event: "message", payload: data });
  await supabase.removeChannel(channel);
  return data as Message;
}

export async function sendAiReplyIfNeeded(matchId: string, lastMessage: Message) {
  return withAiTurnLock(matchId, () => sendAiReplyIfNeededUnlocked(matchId, lastMessage));
}

async function sendAiReplyIfNeededUnlocked(matchId: string, lastMessage: Message) {
  if (lastMessage.sender_role !== "player_a" && lastMessage.sender_role !== "player_b") return null;

  const supabase = supabaseAdmin();
  const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (error) throw error;
  return sendAiTurnIfNeeded(match as PrivateMatch);
}

async function startMatchIfReady(match: PrivateMatch) {
  if (match.status !== "waiting") return match;
  if (!match.player_a_user_id || !match.player_b_user_id) return match;
  if (!match.player_a_entered_at || !match.player_b_entered_at) return match;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("matches")
    .update({ status: "live", started_at: match.started_at ?? new Date().toISOString() })
    .eq("id", match.id)
    .select("*")
    .single();
  if (error) throw error;
  const liveMatch = data as PrivateMatch;
  await withAiTurnLock(liveMatch.id, () => startAiVsAiIfNeeded(liveMatch));
  return liveMatch;
}

async function broadcastMatchUpdate(matchId: string) {
  const supabase = supabaseAdmin();
  const channel = supabase.channel(`matches:${matchId}`);
  await channel.subscribe();
  await channel.send({ type: "broadcast", event: "updated", payload: { matchId } });
  await supabase.removeChannel(channel);
}

export async function sendNextAiMessage(matchId: string) {
  return withAiTurnLock(matchId, async () => {
    const supabase = supabaseAdmin();
    const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
    if (error) throw error;
    return sendAiTurnIfNeeded(match as PrivateMatch);
  });
}

async function startAiVsAiIfNeeded(match: PrivateMatch, continueExisting = false) {
  if (match.status !== "live") return null;
  if (match.player_a_control_type !== "ai" || match.player_b_control_type !== "ai") return null;

  if (!continueExisting) {
    const supabase = supabaseAdmin();
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("match_id", match.id);
    if (error) throw error;
    if (count) return null;
  }

  return sendAiTurnIfNeeded(match);
}

async function sendAiTurnIfNeeded(match: PrivateMatch) {
  if (match.status !== "live") return null;

  const playerAIsAi = match.player_a_control_type === "ai";
  const playerBIsAi = match.player_b_control_type === "ai";
  if (!playerAIsAi && !playerBIsAi) return null;

  const supabase = supabaseAdmin();
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, match_id, sender_role, sender_user_id, message, is_ai_generated, created_at")
    .eq("match_id", match.id)
    .order("created_at", { ascending: true })
    .limit(30);
  if (error) throw error;

  const lastMessage = messages?.at(-1) as Message | undefined;
  if (lastMessage && Date.now() - new Date(lastMessage.created_at).getTime() < 6_000) return null;
  if (lastMessage?.is_ai_generated && !(playerAIsAi && playerBIsAi)) return null;

  const role = nextAiRole({ lastMessage, playerAIsAi, playerBIsAi });
  if (!role) return null;

  const strategy = role === "player_a" ? match.player_a_ai_strategy : match.player_b_ai_strategy;
  const reply = await createAiReplyResult(role, (messages ?? []) as Message[], strategy);
  await new Promise((resolve) => setTimeout(resolve, replyDelayMs(reply.completionTokens)));
  return sendMessage({
    matchId: match.id,
    senderRole: role,
    senderUserId: null,
    message: reply.content,
    isAiGenerated: true
  });
}

function nextAiRole({
  lastMessage,
  playerAIsAi,
  playerBIsAi
}: {
  lastMessage?: Message;
  playerAIsAi: boolean;
  playerBIsAi: boolean;
}): PlayerRole | null {
  if (playerAIsAi && playerBIsAi) {
    return lastMessage?.sender_role === "player_a"
      ? "player_b"
      : lastMessage?.sender_role === "player_b"
        ? "player_a"
        : Math.random() > 0.5
          ? "player_a"
          : "player_b";
  }

  if (playerAIsAi) {
    return !lastMessage || lastMessage.sender_role === "player_b" ? "player_a" : null;
  }

  if (playerBIsAi) {
    return !lastMessage || lastMessage.sender_role === "player_a" ? "player_b" : null;
  }

  return null;
}

function cleanAiStrategy(input?: string) {
  const strategy = (input ?? "").replace(/\s+/g, " ").trim();
  return strategy ? strategy.slice(0, 600) : null;
}

export async function getRevealStats(matchId: string): Promise<RevealStats> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("get_reveal_stats", { p_match_id: matchId });
  if (error) throw error;
  return data as RevealStats;
}

export async function requestReveal(input: { matchId: string; userId: string }) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("matches").select("*").eq("id", input.matchId).single();
  if (error) throw error;
  if (!data) throw new Error("Match not found.");

  const match = data as PrivateMatch;
  if (match.status === "revealed" || match.status === "completed") {
    return { status: "revealed" as const };
  }
  if (match.status !== "live") throw new Error("Match is not live yet.");
  if (!match.player_a_user_id || !match.player_b_user_id) throw new Error("Both players must join first.");
  if (input.userId !== match.player_a_user_id && input.userId !== match.player_b_user_id) {
    throw new Error("Only Player A or Player B can request reveal.");
  }

  const startedAt = match.started_at ?? match.created_at;
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  if (elapsedMs < MIN_REVEAL_MS) {
    const secondsLeft = Math.ceil((MIN_REVEAL_MS - elapsedMs) / 1000);
    throw new Error(`Reveal unlocks in ${secondsLeft} seconds.`);
  }

  if (!match.reveal_requested_by_user_id) {
    const requestedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("matches")
      .update({ reveal_requested_by_user_id: input.userId, reveal_requested_at: requestedAt })
      .eq("id", input.matchId);
    if (updateError) throw updateError;
    await broadcastMatchUpdate(input.matchId);
    return { status: "requested" as const, revealRequestedByUserId: input.userId, revealRequestedAt: requestedAt };
  }

  if (match.reveal_requested_by_user_id === input.userId) {
    return {
      status: "waiting_for_other" as const,
      revealRequestedByUserId: match.reveal_requested_by_user_id,
      revealRequestedAt: match.reveal_requested_at
    };
  }

  const { error: revealError } = await supabase
    .from("matches")
    .update({ status: "revealed", revealed_at: new Date().toISOString() })
    .eq("id", input.matchId);
  if (revealError) throw revealError;
  await broadcastMatchUpdate(input.matchId);
  return { status: "revealed" as const };
}

export type { PublicMatch };
