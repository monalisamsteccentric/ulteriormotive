export type User = { id: string; email: string; name: string; passwordHash?: string };
export type ChatMessage = { id: string; seat: 'a' | 'b'; text: string; at: number };
export type Match = {
  id: string; title: string; topic: string; hostId: string; guestId: string | null;
  opponent: 'human' | 'practice' | 'ollama' | 'ai'; humanSeat?: 'a' | 'b'; generation?: { key: string; until: number }; status: 'waiting' | 'live' | 'voting' | 'finished';
  messages: ChatMessage[]; turn: 'a' | 'b'; votes: Record<string, 'human' | 'ai' | 'a' | 'b'>;
  votingEndsAt: number | null; createdAt: number; version: number;
};
export type Session = { userId: string; expiresAt: number; providerToken?: string; refreshToken?: string; providerExpiresAt?: number; refreshingUntil?: number };
export type Inquiry = { id: string; name: string; email: string; company: string; message: string; role?: string; requirements?: string; at: number };
export type State = { users: User[]; sessions: Record<string, Session>; matches: Match[]; inquiries: Inquiry[]; rates: Record<string, { start: number; count: number }> };
export type Viewer = { id: string; name: string } | null;
export type PublicMatch = {
  id: string; title: string; topic: string; status: Match['status']; messages: ChatMessage[];
  seat: 'a' | 'b' | 'audience'; turn: 'a' | 'b'; voteCount: number; myVote: 'human' | 'ai' | 'a' | 'b' | null;
  version: number; createdAt: number; votingEndsAt: number | null;
  canRetryOpponent: boolean; isHost: boolean; ballot: 'identity' | 'seat';
  result: null | { humanSeat: 'a' | 'b' | null; identity: 'human' | 'ai'; opponentLabel: string; humanVotes: number; aiVotes: number; fooled: number; winner: 'contender' | 'audience' | 'draw' | 'no-votes' };
};
