import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ControlType, MonthlyChampion, MonthlyFinal, MonthlyLeaderboardEntry, PlayerRole, VoteChoice } from "@/types/database";

const MATCH_POINTS = 10;
const DECEPTION_POINT = 1;
const WIN_POINTS = 50;
const HIGH_DECEPTION_BONUS = 25;
export const MONTHLY_PRIZE_AMOUNT = 5000;

export type ChampionshipPeriod = {
  month: number;
  year: number;
};

export type LeaderboardDisplayEntry = MonthlyLeaderboardEntry & {
  player_name: string;
};

type MatchRow = {
  id: string;
  player_a_user_id: string | null;
  player_b_user_id: string | null;
  player_a_control_type: ControlType | null;
  player_b_control_type: ControlType | null;
  status: string;
  match_type?: "regular" | "monthly_final";
  created_at: string;
  championship_month?: number | null;
  championship_year?: number | null;
  championship_scored_at?: string | null;
};

type VoteRow = {
  voter_user_id: string;
  vote: VoteChoice;
};

type PlayerResult = {
  role: PlayerRole;
  userId: string;
  audienceDeceived: number;
  wonMatch: boolean;
  points: number;
};

export function currentPeriod(date = new Date()): ChampionshipPeriod {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function periodLabel(period: ChampionshipPeriod) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(period.year, period.month - 1, 1)
  );
}

export async function getLeaderboard(period = currentPeriod()): Promise<LeaderboardDisplayEntry[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("monthly_leaderboard")
    .select("*")
    .eq("month", period.month)
    .eq("year", period.year)
    .order("rank", { ascending: true, nullsFirst: false })
    .order("total_points", { ascending: false });
  if (isMissingChampionshipTable(error)) return [];
  if (error) throw error;

  const entries = (data ?? []) as MonthlyLeaderboardEntry[];
  const names = await getProfileNames(entries.map((entry) => entry.user_id));
  return entries.map((entry) => ({
    ...entry,
    player_name: names.get(entry.user_id) ?? shortPlayerName(entry.user_id)
  }));
}

export async function getCurrentFinal(period = currentPeriod()) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("monthly_finals")
    .select("*")
    .eq("month", period.month)
    .eq("year", period.year)
    .maybeSingle();
  if (isMissingChampionshipTable(error)) return null;
  if (error) throw error;
  return (data ?? null) as MonthlyFinal | null;
}

export async function getPastChampions(limit = 24) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("monthly_champions")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(limit);
  if (isMissingChampionshipTable(error)) return [];
  if (error) throw error;

  const champions = (data ?? []) as MonthlyChampion[];
  const names = await getProfileNames(champions.flatMap((row) => [row.champion_user_id, row.runner_up_user_id]));
  return champions.map((row) => ({
    ...row,
    champion_name: names.get(row.champion_user_id) ?? shortPlayerName(row.champion_user_id),
    runner_up_name: names.get(row.runner_up_user_id) ?? shortPlayerName(row.runner_up_user_id)
  }));
}

export async function scoreCompletedMatch(matchId: string) {
  const supabase = supabaseAdmin();
  const { data: match, error: matchError } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (matchError) throw matchError;

  const safeMatch = match as MatchRow;
  if (safeMatch.championship_scored_at) return { ok: true, skipped: "already_scored" };
  if (safeMatch.status !== "revealed" && safeMatch.status !== "completed") return { ok: false, skipped: "not_finished" };
  if (safeMatch.match_type && safeMatch.match_type !== "regular") return { ok: false, skipped: "not_regular" };

  const results = await calculateMatchResults(safeMatch);
  const period = {
    month: safeMatch.championship_month ?? new Date(safeMatch.created_at).getMonth() + 1,
    year: safeMatch.championship_year ?? new Date(safeMatch.created_at).getFullYear()
  };

  for (const result of results) {
    if (isSyntheticUser(result.userId)) continue;
    await upsertMatchParticipant(matchId, result);
    await addLeaderboardResult(period, result);
  }

  await recalculateRanks(period);
  await supabase.from("matches").update({ status: "completed", completed_at: new Date().toISOString(), championship_scored_at: new Date().toISOString() }).eq("id", matchId);
  return { ok: true, results };
}

export async function freezeLeaderboard(period = currentPeriod()) {
  await recalculateRanks(period);
  const leaderboard = await getLeaderboard(period);
  const finalists = leaderboard.filter((entry) => entry.qualification_status !== "disqualified").slice(0, 2);
  if (finalists.length < 2) throw new Error("At least two ranked players are required to freeze the monthly finalists.");

  const supabase = supabaseAdmin();
  await supabase
    .from("monthly_leaderboard")
    .update({ frozen_at: new Date().toISOString(), qualification_status: "not_qualified", updated_at: new Date().toISOString() })
    .eq("month", period.month)
    .eq("year", period.year)
    .neq("qualification_status", "disqualified");

  await supabase
    .from("monthly_leaderboard")
    .update({ frozen_at: new Date().toISOString(), qualification_status: "finalist", updated_at: new Date().toISOString() })
    .eq("month", period.month)
    .eq("year", period.year)
    .in("user_id", finalists.map((entry) => entry.user_id));

  const { data, error } = await supabase
    .from("monthly_finals")
    .upsert(
      {
        month: period.month,
        year: period.year,
        finalist_one_user_id: finalists[0].user_id,
        finalist_two_user_id: finalists[1].user_id,
        status: "scheduled",
        updated_at: new Date().toISOString()
      },
      { onConflict: "month,year" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as MonthlyFinal;
}

export async function createOrScheduleFinalMatch(period = currentPeriod()) {
  const supabase = supabaseAdmin();
  let final = await getCurrentFinal(period);
  if (!final) final = await freezeLeaderboard(period);
  if (final.final_match_id) return final;

  const inviteCode = createInviteCode();
  const waitUntil = new Date(Date.now() + 60 * 60_000).toISOString();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      invite_code: inviteCode,
      wait_until: waitUntil,
      status: "waiting",
      match_type: "monthly_final",
      championship_month: period.month,
      championship_year: period.year
    })
    .select("id")
    .single();
  if (matchError) throw matchError;

  const { data, error } = await supabase
    .from("monthly_finals")
    .update({ final_match_id: match.id, status: "scheduled", updated_at: new Date().toISOString() })
    .eq("id", final.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MonthlyFinal;
}

export async function finalizeMonthlyChampion(input: {
  period?: ChampionshipPeriod;
  championUserId?: string;
  runnerUpUserId?: string;
  adminNote?: string;
}) {
  const period = input.period ?? currentPeriod();
  const supabase = supabaseAdmin();
  const final = await getCurrentFinal(period);
  if (!final) throw new Error("No monthly final is scheduled.");
  if (!final.final_match_id && !input.championUserId) throw new Error("Schedule a final match or choose a manual champion.");

  let championUserId = input.championUserId;
  let runnerUpUserId = input.runnerUpUserId;

  if (!championUserId && final.final_match_id) {
    const { data: match, error } = await supabase.from("matches").select("*").eq("id", final.final_match_id).single();
    if (error) throw error;
    const results = await calculateMatchResults(match as MatchRow);
    const winner = results.find((result) => result.wonMatch);
    if (!winner) throw new Error("Final match is tied. Use manual finalize to choose the champion.");
    championUserId = winner.userId;
    runnerUpUserId = results.find((result) => result.userId !== winner.userId)?.userId;
  }

  if (!championUserId) throw new Error("Champion is required.");
  runnerUpUserId ??= championUserId === final.finalist_one_user_id ? final.finalist_two_user_id : final.finalist_one_user_id;

  const { data, error } = await supabase
    .from("monthly_champions")
    .upsert(
      {
        month: period.month,
        year: period.year,
        champion_user_id: championUserId,
        runner_up_user_id: runnerUpUserId,
        final_match_id: final.final_match_id,
        prize_amount: MONTHLY_PRIZE_AMOUNT,
        prize_status: "unpaid",
        admin_note: input.adminNote || null,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "month,year" }
    )
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("monthly_finals").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", final.id);
  await supabase.from("monthly_leaderboard").update({ qualification_status: "champion" }).eq("month", period.month).eq("year", period.year).eq("user_id", championUserId);
  await supabase.from("monthly_leaderboard").update({ qualification_status: "runner_up" }).eq("month", period.month).eq("year", period.year).eq("user_id", runnerUpUserId);
  return data as MonthlyChampion;
}

export async function disqualifyUser(userId: string, period = currentPeriod()) {
  const supabase = supabaseAdmin();
  await supabase.from("profiles").update({ is_banned: true }).eq("id", userId);
  await supabase
    .from("monthly_leaderboard")
    .update({ qualification_status: "disqualified", updated_at: new Date().toISOString() })
    .eq("month", period.month)
    .eq("year", period.year)
    .eq("user_id", userId);
  await recalculateRanks(period);
}

export async function updatePrizeStatus(input: { period?: ChampionshipPeriod; prizeStatus: "paid" | "unpaid"; adminNote?: string }) {
  const period = input.period ?? currentPeriod();
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("monthly_champions")
    .update({ prize_status: input.prizeStatus, admin_note: input.adminNote || null, updated_at: new Date().toISOString() })
    .eq("month", period.month)
    .eq("year", period.year);
  if (error) throw error;
}

async function calculateMatchResults(match: MatchRow): Promise<PlayerResult[]> {
  if (!match.player_a_user_id || !match.player_b_user_id || !match.player_a_control_type || !match.player_b_control_type) {
    throw new Error("Match participants or identities are missing.");
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("audience_votes").select("voter_user_id, vote").eq("match_id", match.id);
  if (error) throw error;

  const votes = (data ?? []) as VoteRow[];
  const aDeceived = countDeceived(votes, "player_a", match.player_a_control_type);
  const bDeceived = countDeceived(votes, "player_b", match.player_b_control_type);
  const winner: PlayerRole | "tie" = aDeceived > bDeceived ? "player_a" : bDeceived > aDeceived ? "player_b" : "tie";

  return [
    buildPlayerResult("player_a", match.player_a_user_id, aDeceived, votes.length, winner),
    buildPlayerResult("player_b", match.player_b_user_id, bDeceived, votes.length, winner)
  ];
}

function buildPlayerResult(role: PlayerRole, userId: string, audienceDeceived: number, totalVotes: number, winner: PlayerRole | "tie"): PlayerResult {
  const wonMatch = winner === role;
  const highDeceptionBonus = totalVotes > 0 && audienceDeceived / totalVotes > 0.7 ? HIGH_DECEPTION_BONUS : 0;
  return {
    role,
    userId,
    audienceDeceived,
    wonMatch,
    points: MATCH_POINTS + audienceDeceived * DECEPTION_POINT + (wonMatch ? WIN_POINTS : 0) + highDeceptionBonus
  };
}

function countDeceived(votes: VoteRow[], role: PlayerRole, actualType: ControlType) {
  return votes.filter((row) => guessForRole(row.vote, role) !== actualType).length;
}

function guessForRole(vote: VoteChoice, role: PlayerRole): ControlType {
  if (role === "player_a") return vote === "player_a_ai" || vote === "both_ai" ? "ai" : "human";
  return vote === "player_b_ai" || vote === "both_ai" ? "ai" : "human";
}

async function upsertMatchParticipant(matchId: string, result: PlayerResult) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("match_participants").upsert(
    {
      match_id: matchId,
      user_id: result.userId,
      player_role: result.role,
      audience_deceived: result.audienceDeceived,
      points_earned: result.points,
      won_match: result.wonMatch,
      updated_at: new Date().toISOString()
    },
    { onConflict: "match_id,user_id" }
  );
  if (error) throw error;
}

async function addLeaderboardResult(period: ChampionshipPeriod, result: PlayerResult) {
  const supabase = supabaseAdmin();
  const { data: current, error: readError } = await supabase
    .from("monthly_leaderboard")
    .select("*")
    .eq("user_id", result.userId)
    .eq("month", period.month)
    .eq("year", period.year)
    .maybeSingle();
  if (readError) throw readError;

  const nextMatchesPlayed = Number(current?.matches_played ?? 0) + 1;
  const nextAudienceDeceived = Number(current?.total_audience_deceived ?? 0) + result.audienceDeceived;
  const nextMatchesWon = Number(current?.matches_won ?? 0) + (result.wonMatch ? 1 : 0);
  const nextPoints = Number(current?.total_points ?? 0) + result.points;
  const qualificationStatus = current?.qualification_status === "disqualified" ? "disqualified" : "not_qualified";

  const { error } = await supabase.from("monthly_leaderboard").upsert(
    {
      user_id: result.userId,
      month: period.month,
      year: period.year,
      matches_played: nextMatchesPlayed,
      matches_won: nextMatchesWon,
      total_audience_deceived: nextAudienceDeceived,
      average_deception_per_match: Number((nextAudienceDeceived / nextMatchesPlayed).toFixed(2)),
      total_points: nextPoints,
      qualification_status: qualificationStatus,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,month,year" }
  );
  if (error) throw error;
}

async function recalculateRanks(period: ChampionshipPeriod) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("monthly_leaderboard")
    .select("*")
    .eq("month", period.month)
    .eq("year", period.year)
    .neq("qualification_status", "disqualified")
    .order("total_points", { ascending: false })
    .order("total_audience_deceived", { ascending: false })
    .order("matches_won", { ascending: false });
  if (error) throw error;

  let rank = 1;
  for (const entry of (data ?? []) as MonthlyLeaderboardEntry[]) {
    const qualificationStatus = rank <= 2 && !entry.frozen_at ? "qualified" : entry.qualification_status === "qualified" ? "not_qualified" : entry.qualification_status;
    const { error: updateError } = await supabase
      .from("monthly_leaderboard")
      .update({ rank, qualification_status: qualificationStatus, updated_at: new Date().toISOString() })
      .eq("id", entry.id);
    if (updateError) throw updateError;
    rank += 1;
  }
}

async function getProfileNames(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter((id) => !isSyntheticUser(id) && isUuid(id))));
  const names = new Map<string, string>();
  if (!uniqueIds.length) return names;

  const supabase = supabaseAdmin();
  const { data } = await supabase.from("profiles").select("id, username").in("id", uniqueIds);
  for (const profile of data ?? []) names.set(profile.id, profile.username);
  return names;
}

function shortPlayerName(userId: string) {
  if (userId.startsWith("ai:")) return "AI seat";
  return `Player ${userId.slice(0, 6)}`;
}

function isSyntheticUser(userId: string) {
  return userId.startsWith("ai:");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createInviteCode() {
  return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase();
}

function isMissingChampionshipTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  const message = String(candidate.message ?? "");
  return candidate.code === "42P01" || candidate.code === "PGRST205" || message.includes("monthly_leaderboard") || message.includes("monthly_finals") || message.includes("monthly_champions");
}
