import { RevealStats } from "@/types/database";
import { callMatchEdgeFunctionJson } from "./edgeProxy";

export async function getRevealStats(matchId: string): Promise<RevealStats> {
  return callMatchEdgeFunctionJson<RevealStats>("reveal-stats", { matchId });
}
