import { randomUUID } from 'node:crypto';
import type { Match, PublicMatch } from './types';
export class GameError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function createMatch(hostId: string, title: string, topic: string, opponent: Match['opponent'], now = Date.now()): Match {
  return { id: randomUUID(), title, topic, hostId, guestId: null, opponent, status: opponent === 'human' ? 'waiting' : 'live', messages: [], turn: 'a', votes: {}, votingEndsAt: null, createdAt: now, version: 1 };
}
export function seatOf(m: Match, userId?: string): PublicMatch['seat'] { return userId === m.hostId ? 'a' : userId && userId === m.guestId ? 'b' : 'audience'; }
export function finishIfDue(m: Match, now = Date.now()) {
  if (m.status === 'voting' && m.votingEndsAt !== null && now >= m.votingEndsAt) { m.status = 'finished'; m.version++; }
}
export function viewMatch(m: Match, userId?: string, now = Date.now()): PublicMatch {
  // Read projection independently reflects the deadline; persisted settlement happens on normal API polling.
  const status = m.status === 'voting' && m.votingEndsAt !== null && now >= m.votingEndsAt ? 'finished' : m.status;
  const values = Object.values(m.votes), humanVotes = values.filter((v) => v === 'human').length, aiVotes = values.length - humanVotes;
  const identity = m.opponent === 'human' ? 'human' : 'ai';
  const fooled = identity === 'human' ? aiVotes : humanVotes;
  return { id: m.id, title: m.title, topic: m.topic, status, messages: m.messages,
    seat: seatOf(m, userId), turn: m.turn, voteCount: values.length, myVote: userId ? m.votes[userId] || null : null,
    version: m.version, createdAt: m.createdAt, votingEndsAt: m.votingEndsAt,
    canRetryOpponent: userId === m.hostId && m.opponent !== 'human' && m.status === 'live' && m.turn === 'b',
    result: status !== 'finished' ? null : { identity, opponentLabel: m.opponent === 'practice' ? 'Scripted practice bot' : m.opponent === 'ollama' ? 'Local language model' : 'Human participant', humanVotes, aiVotes, fooled, winner: !values.length ? 'no-votes' : fooled * 2 === values.length ? 'draw' : fooled * 2 > values.length ? 'contender' : 'audience' },
  };
}
export function joinMatch(m: Match, userId: string) {
  if (m.status !== 'waiting' || m.opponent !== 'human') throw new GameError('This room no longer has an open seat.', 409);
  if (m.hostId === userId) throw new GameError('The host already occupies Contender 01.');
  m.guestId = userId; m.status = 'live'; m.version++;
}
export function addMessage(m: Match, userId: string, text: string, id: string) {
  const existing = m.messages.find((v) => v.id === id), seat = seatOf(m, userId);
  if (existing) {
    if (existing.seat !== seat || existing.text !== text) throw new GameError('Message identity already used.', 409);
    return;
  }
  if (m.status !== 'live' || seat === 'audience' || seat !== m.turn) throw new GameError('It is not your turn in this conversation.', 403);
  m.messages.push({ id, seat, text, at: Date.now() }); m.turn = seat === 'a' ? 'b' : 'a'; m.version++;
  if (m.messages.length >= 10) openVoting(m);
}
export function openVoting(m: Match) {
  if (m.status !== 'live' || m.messages.length < 2) throw new GameError('Exchange at least two messages before opening the vote.', 409);
  m.status = 'voting'; m.votingEndsAt = Date.now() + 60000; m.version++;
}
export function vote(m: Match, userId: string, choice: 'human' | 'ai', now = Date.now()) {
  if (m.status !== 'voting' || m.votingEndsAt === null || now >= m.votingEndsAt) throw new GameError('Voting is closed.', 409);
  if (seatOf(m, userId) !== 'audience') throw new GameError('Contenders cannot vote in their own match.', 403);
  if (m.votes[userId]) throw new GameError('Your ballot is already locked in.', 409);
  m.votes[userId] = choice; m.version++;
}
export function practiceReply(last: string, number: number): string {
  const replies = [
    'I think the small details give us away. What is something you noticed today that nobody else would?',
    'That sounds reasonable, but I would probably overthink it and do the opposite. Has that ever happened to you?',
    'I am less interested in the perfect answer than the honest one. What would you actually choose?',
    'Maybe the audience is reading too much into the pauses. A confident answer can still be completely made up.',
    'I will leave them with this: sounding certain is not the same as being right. Your call, audience.',
  ];
  return /\?$/.test(last.trim()) && number === 0 ? 'Good question. I would start with the thing that feels a little embarrassing to admit. What would your answer be?' : replies[number % replies.length];
}
