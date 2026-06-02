import { supabaseServer } from "@/lib/supabaseServer";
import { MonthlyChampion, MonthlyFinal, MonthlyLeaderboardEntry } from "@/types/database";

export const MONTHLY_PRIZE_AMOUNT = 5000;

export type ChampionshipPeriod = {
  month: number;
  year: number;
};

export type LeaderboardDisplayEntry = MonthlyLeaderboardEntry & {
  player_name: string;
};

export type ChampionDisplayEntry = MonthlyChampion & {
  champion_name: string;
  runner_up_name: string;
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
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("monthly_leaderboard")
    .select("*")
    .eq("month", period.month)
    .eq("year", period.year)
    .order("rank", { ascending: true, nullsFirst: false })
    .order("total_points", { ascending: false });
  if (isMissingChampionshipSchema(error)) return [];
  if (error) throw error;

  const entries = (data ?? []) as MonthlyLeaderboardEntry[];
  const names = await getProfileNames(entries.map((entry) => entry.user_id));
  return entries.map((entry) => ({
    ...entry,
    player_name: names.get(entry.user_id) ?? shortPlayerName(entry.user_id)
  }));
}

export async function getCurrentFinal(period = currentPeriod()) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("monthly_finals")
    .select("*")
    .eq("month", period.month)
    .eq("year", period.year)
    .maybeSingle();
  if (isMissingChampionshipSchema(error)) return null;
  if (error) throw error;
  return (data ?? null) as MonthlyFinal | null;
}

export async function getPastChampions(limit = 24): Promise<ChampionDisplayEntry[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("monthly_champions")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(limit);
  if (isMissingChampionshipSchema(error)) return [];
  if (error) throw error;

  const champions = (data ?? []) as MonthlyChampion[];
  const names = await getProfileNames(champions.flatMap((row) => [row.champion_user_id, row.runner_up_user_id]));
  return champions.map((row) => ({
    ...row,
    champion_name: names.get(row.champion_user_id) ?? shortPlayerName(row.champion_user_id),
    runner_up_name: names.get(row.runner_up_user_id) ?? shortPlayerName(row.runner_up_user_id)
  }));
}

async function getProfileNames(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter((id) => !isSyntheticUser(id) && isUuid(id))));
  const names = new Map<string, string>();
  if (!uniqueIds.length) return names;

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("profiles").select("id, username").in("id", uniqueIds);
  if (isMissingChampionshipSchema(error)) return names;
  if (error) throw error;
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

function isMissingChampionshipSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; details?: string; hint?: string };
  const text = [candidate.message, candidate.details, candidate.hint].filter(Boolean).join(" ").toLowerCase();
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST106" ||
    candidate.code === "PGRST116" ||
    candidate.code === "PGRST205" ||
    text.includes("monthly_leaderboard") ||
    text.includes("monthly_finals") ||
    text.includes("monthly_champions") ||
    text.includes("schema cache")
  );
}
