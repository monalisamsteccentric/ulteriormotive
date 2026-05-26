export type ControlType = "human" | "ai";
export type MatchStatus = "waiting" | "live" | "revealed" | "completed";
export type PlayerRole = "player_a" | "player_b";
export type SenderRole = PlayerRole | "audience" | "system";
export type VoteChoice = "player_a_ai" | "player_b_ai" | "both_ai" | "none_ai";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type PublicMatch = {
  id: string;
  player_a_user_id: string | null;
  player_b_user_id: string | null;
  player_a_entered_at: string | null;
  player_b_entered_at: string | null;
  status: MatchStatus;
  invite_code: string;
  wait_until: string | null;
  wait_reminder_sent_at?: string | null;
  created_at: string;
  started_at: string | null;
  revealed_at: string | null;
  reveal_requested_by_user_id: string | null;
  reveal_requested_at: string | null;
  player_a_revealed_type?: ControlType | null;
  player_b_revealed_type?: ControlType | null;
};

export type PrivateMatch = PublicMatch & {
  player_a_control_type: ControlType | null;
  player_b_control_type: ControlType | null;
  player_a_ai_strategy: string | null;
  player_b_ai_strategy: string | null;
};

export type Message = {
  id: string;
  match_id: string;
  sender_role: SenderRole;
  sender_user_id: string | null;
  message: string;
  is_ai_generated?: boolean;
  created_at: string;
};

export type VoteStats = {
  playerAIsAiPercent: number;
  playerBIsAiPercent: number;
  totalVotes: number;
};

export type RevealStats = VoteStats & {
  playerAType: ControlType;
  playerBType: ControlType;
  audienceAccuracyPercent: number;
  correctVotes: number;
  playerAWrongGuesses: number;
  playerBWrongGuesses: number;
  deceptionWinner: PlayerRole | "tie";
  playerAScore: PlayerScore;
  playerBScore: PlayerScore;
  scoreWinner: PlayerRole | "tie";
};

export type PlayerScore = {
  role: PlayerRole;
  targetRole: PlayerRole;
  targetActualType: ControlType;
  guessedType: ControlType | null;
  correct: boolean | null;
  baseScore: number;
  percentChange: number;
  finalScore: number;
};
