import { ControlType, Message, PlayerRole, PrivateMatch, PublicMatch, RevealStats, VoteChoice } from "@/types/database";
import { createAiReplyResult, replyDelayMs } from "./aiPlayer";
import { supabaseAdmin } from "./supabaseServer";
import { cleanMessage, createInviteCode, validateMessage } from "./utils";

const aiTurnLocks = new Map<string, Promise<unknown>>();
const MIN_REVEAL_MS = 2 * 60 * 1000;
const WAIT_REMINDER_MS = 60 * 1000;
const WAITING_MATCH_ALERT_EMAIL = process.env.WAITING_MATCH_ALERT_EMAIL || "monalisa.sahoo.jsr@gmail.com";

// Edit this when you want the auto-filled AI opponent to use a different default personality.
export const DEFAULT_EXPIRED_WAIT_AI_STRATEGY =
  "You joined because the other player did not arrive before the waiting timer ended. Sound like a casual human texting on mobile. Keep replies short, natural, slightly imperfect, and do not reveal that you are AI.";

type WaitingMatchRow = PrivateMatch & {
  wait_reminder_sent_at: string | null;
};

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

  await fillEmptySeatWithAi(match as WaitingMatchRow);
}

export async function injectAiIntoOpenSeat(matchId: string) {
  const supabase = supabaseAdmin();
  const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (error) throw error;
  if (!match || match.status !== "waiting") return false;
  return fillEmptySeatWithAi(match as WaitingMatchRow, { ignoreWaitTimer: true });
}

export async function processWaitingMatches() {
  const supabase = supabaseAdmin();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const reminderCutoffIso = new Date(now + WAIT_REMINDER_MS).toISOString();

  const { data: reminderMatches, error: reminderError } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "waiting")
    .is("wait_reminder_sent_at", null)
    .gt("wait_until", nowIso)
    .lte("wait_until", reminderCutoffIso)
    .or("player_a_user_id.is.null,player_b_user_id.is.null");
  if (reminderError) throw reminderError;

  let remindersSent = 0;
  let reminderErrors = 0;
  for (const match of (reminderMatches ?? []) as WaitingMatchRow[]) {
    try {
      const sent = await sendWaitReminderEmail(match);
      await supabase
        .from("matches")
        .update({ wait_reminder_sent_at: new Date().toISOString() })
        .eq("id", match.id)
        .is("wait_reminder_sent_at", null);
      if (sent) remindersSent += 1;
    } catch (error) {
      reminderErrors += 1;
      console.error("Waiting match reminder failed", error);
    }
  }

  const { data: expiredMatches, error: expiredError } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "waiting")
    .lte("wait_until", nowIso)
    .or("player_a_user_id.is.null,player_b_user_id.is.null");
  if (expiredError) throw expiredError;

  let aiAssigned = 0;
  for (const match of (expiredMatches ?? []) as WaitingMatchRow[]) {
    const filled = await fillEmptySeatWithAi(match);
    if (filled) aiAssigned += 1;
  }

  return {
    remindersChecked: reminderMatches?.length ?? 0,
    remindersSent,
    reminderErrors,
    aiAssigned
  };
}

async function fillEmptySeatWithAi(match: WaitingMatchRow, options: { ignoreWaitTimer?: boolean } = {}) {
  if (match.status !== "waiting") return false;
  if (!options.ignoreWaitTimer && match.wait_until && new Date(match.wait_until).getTime() > Date.now()) return false;
  if (match.player_a_user_id && match.player_b_user_id) return false;

  const nowIso = new Date().toISOString();
  const update =
    !match.player_a_user_id
      ? {
          player_a_user_id: `ai:${match.id}:player_a`,
          player_a_entered_at: nowIso,
          player_a_control_type: "ai" as const,
          player_a_ai_strategy: match.player_a_ai_strategy || DEFAULT_EXPIRED_WAIT_AI_STRATEGY,
          status: "live" as const,
          started_at: match.started_at ?? nowIso
        }
      : {
          player_b_user_id: `ai:${match.id}:player_b`,
          player_b_entered_at: nowIso,
          player_b_control_type: "ai" as const,
          player_b_ai_strategy: match.player_b_ai_strategy || DEFAULT_EXPIRED_WAIT_AI_STRATEGY,
          status: "live" as const,
          started_at: match.started_at ?? nowIso
        };

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", match.id)
    .eq("status", "waiting")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const liveMatch = data as PrivateMatch;
  await broadcastMatchUpdate(match.id);
  await withAiTurnLock(match.id, () => startAiVsAiIfNeeded(liveMatch, true));
  return true;
}

async function sendWaitReminderEmail(match: WaitingMatchRow) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("Skipping waiting match reminder email: RESEND_API_KEY is not configured.");
    return false;
  }

  const appUrl = getAppUrl();
  const joinUrl = `${appUrl}/join/${match.invite_code}`;
  const matchUrl = `${appUrl}/match/${match.id}`;
  const emptySeat = !match.player_a_user_id ? "Player A" : "Player B";
  const waitUntil = match.wait_until ? new Date(match.wait_until).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "soon";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.WAITING_MATCH_EMAIL_FROM || "Ulterior Motive <onboarding@resend.dev>",
      to: WAITING_MATCH_ALERT_EMAIL,
      subject: `Ulterior Motive match needs ${emptySeat}`,
      text: [
        `A match has about one minute left before AI is assigned.`,
        ``,
        `Match ID: ${match.id}`,
        `Invite code: ${match.invite_code}`,
        `Empty seat: ${emptySeat}`,
        `Wait timer ends: ${waitUntil}`,
        ``,
        `Join link: ${joinUrl}`,
        `Match room: ${matchUrl}`,
        ``,
        `If nobody joins before the timer ends, the empty seat will be assigned to AI automatically.`
      ].join("\n")
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Reminder email failed: ${response.status} ${message}`);
  }

  return true;
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
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
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("player_a_user_id, player_b_user_id, player_a_control_type, player_b_control_type, status")
    .eq("id", matchId)
    .single();
  if (matchError) throw matchError;
  if (!match || (match.status !== "revealed" && match.status !== "completed")) {
    throw new Error("Match is not revealed");
  }

  const playerAType = match.player_a_control_type as ControlType | null;
  const playerBType = match.player_b_control_type as ControlType | null;
  if (!playerAType || !playerBType) throw new Error("Player identities are missing.");

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("voter_user_id, vote")
    .eq("match_id", matchId);
  if (votesError) throw votesError;

  return buildRevealStats({
    playerAType,
    playerBType,
    playerAUserId: match.player_a_user_id,
    playerBUserId: match.player_b_user_id,
    votes: (votes ?? []) as { voter_user_id: string; vote: VoteChoice }[]
  });
}

function buildRevealStats({
  playerAType,
  playerBType,
  playerAUserId,
  playerBUserId,
  votes
}: {
  playerAType: ControlType;
  playerBType: ControlType;
  playerAUserId: string | null;
  playerBUserId: string | null;
  votes: { voter_user_id: string; vote: VoteChoice }[];
}): RevealStats {
  const totalVotes = votes.length;
  let correctVotes = 0;
  let playerAIsAiVotes = 0;
  let playerBIsAiVotes = 0;
  let playerAWrongGuesses = 0;
  let playerBWrongGuesses = 0;

  for (const { vote } of votes) {
    const guessedAType: ControlType = vote === "player_a_ai" || vote === "both_ai" ? "ai" : "human";
    const guessedBType: ControlType = vote === "player_b_ai" || vote === "both_ai" ? "ai" : "human";

    if (guessedAType === "ai") playerAIsAiVotes += 1;
    if (guessedBType === "ai") playerBIsAiVotes += 1;
    if (guessedAType !== playerAType) playerAWrongGuesses += 1;
    if (guessedBType !== playerBType) playerBWrongGuesses += 1;
    if (guessedAType === playerAType && guessedBType === playerBType) correctVotes += 1;
  }

  const deceptionWinner =
    playerAWrongGuesses > playerBWrongGuesses
      ? "player_a"
      : playerBWrongGuesses > playerAWrongGuesses
        ? "player_b"
        : "tie";
  const playerAVote = votes.find((row) => row.voter_user_id === playerAUserId)?.vote ?? null;
  const playerBVote = votes.find((row) => row.voter_user_id === playerBUserId)?.vote ?? null;
  const playerAScore = buildPlayerScore({
    role: "player_a",
    targetRole: "player_b",
    targetActualType: playerBType,
    guessedType: playerAVote ? guessForRole(playerAVote, "player_b") : null
  });
  const playerBScore = buildPlayerScore({
    role: "player_b",
    targetRole: "player_a",
    targetActualType: playerAType,
    guessedType: playerBVote ? guessForRole(playerBVote, "player_a") : null
  });
  const scoreWinner =
    playerAScore.finalScore > playerBScore.finalScore
      ? "player_a"
      : playerBScore.finalScore > playerAScore.finalScore
        ? "player_b"
        : "tie";

  return {
    playerAType,
    playerBType,
    audienceAccuracyPercent: percent(correctVotes, totalVotes),
    correctVotes,
    totalVotes,
    playerAIsAiPercent: percent(playerAIsAiVotes, totalVotes),
    playerBIsAiPercent: percent(playerBIsAiVotes, totalVotes),
    playerAWrongGuesses,
    playerBWrongGuesses,
    deceptionWinner,
    playerAScore,
    playerBScore,
    scoreWinner
  };
}

function guessForRole(vote: VoteChoice, role: PlayerRole): ControlType {
  if (role === "player_a") {
    return vote === "player_a_ai" || vote === "both_ai" ? "ai" : "human";
  }
  return vote === "player_b_ai" || vote === "both_ai" ? "ai" : "human";
}

function buildPlayerScore(input: {
  role: PlayerRole;
  targetRole: PlayerRole;
  targetActualType: ControlType;
  guessedType: ControlType | null;
}) {
  const baseScore = 100;
  const correct = input.guessedType ? input.guessedType === input.targetActualType : null;
  const percentChange = correct === null ? 0 : correct ? 30 : -30;

  return {
    ...input,
    correct,
    baseScore,
    percentChange,
    finalScore: Math.round(baseScore * (1 + percentChange / 100))
  };
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((100 * value) / total);
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
