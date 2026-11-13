import test from 'node:test';
import assert from 'node:assert/strict';
import { addMessage, createMatch, finishIfDue, joinMatch, openVoting, practiceReply, viewMatch, vote } from '../src/lib/game';
import { passwordHash, passwordMatches } from '../src/lib/auth';
test('new human match has an atomic open seat; host cannot occupy both seats', () => {
  const m = createMatch('host', 'A room', 'An interesting conversation', 'human');
  assert.equal(m.status, 'waiting'); assert.throws(() => joinMatch(m, 'host'));
  joinMatch(m, 'guest'); assert.equal(m.status, 'live'); assert.throws(() => joinMatch(m, 'another'));
});
test('hidden identity, names, participant IDs and vote distribution do not leak before reveal', () => {
  const m = createMatch('private-host', 'A room', 'An interesting conversation', 'practice');
  m.messages.push({ id: 'message', seat: 'a', text: 'Hello', at: Date.now() });
  m.votes.observer = 'human';
  const projection = viewMatch(m, 'observer');
  assert.equal(projection.result, null); assert.equal(projection.myVote, 'human');
  const data = JSON.stringify(viewMatch(m));
  for (const secret of ['private-host', 'practice', 'observer', 'humanVotes', 'guestId', 'opponentLabel']) assert.ok(!data.includes(secret), secret);
});
test('alternating turns, spectator denial, idempotency and conflicting IDs', () => {
  const m = createMatch('host', 'Room', 'An interesting topic', 'human'); joinMatch(m, 'guest');
  addMessage(m, 'host', 'Hello', 'one'); addMessage(m, 'host', 'Hello', 'one');
  assert.equal(m.messages.length, 1);
  assert.throws(() => addMessage(m, 'host', 'Changed', 'one'));
  assert.throws(() => addMessage(m, 'host', 'Out of turn', 'two'));
  assert.throws(() => addMessage(m, 'observer', 'Not a player', 'two'));
  addMessage(m, 'guest', 'Hello back', 'two'); assert.equal(m.turn, 'a');
});
test('voting requires enough messages and excludes both contenders', () => {
  const m = createMatch('host', 'Room', 'An interesting topic', 'human'); joinMatch(m, 'guest');
  assert.throws(() => openVoting(m)); addMessage(m, 'host', 'Hi', 'one'); addMessage(m, 'guest', 'Hello', 'two'); openVoting(m);
  assert.throws(() => vote(m, 'host', 'human')); assert.throws(() => vote(m, 'guest', 'human'));
  vote(m, 'audience', 'human'); assert.throws(() => vote(m, 'audience', 'ai')); assert.equal(m.votes.audience, 'human');
});
test('ten messages automatically open one-minute vote and deadlines cannot be bypassed', () => {
  const m = createMatch('host', 'Room', 'An interesting topic', 'human'); joinMatch(m, 'guest');
  for (let i = 0; i < 10; i++) addMessage(m, i % 2 ? 'guest' : 'host', `Line ${i}`, String(i));
  assert.equal(m.status, 'voting'); assert.ok(m.votingEndsAt! - Date.now() <= 60000);
  assert.throws(() => addMessage(m, 'host', 'Extra', 'eleven')); assert.throws(() => vote(m, 'audience', 'human', m.votingEndsAt!));
  finishIfDue(m, m.votingEndsAt!); assert.equal(m.status, 'finished');
});
test('results distinguish correct majority, fooled majority, tie and no votes', () => {
  const m = createMatch('host', 'Room', 'An interesting topic', 'practice'); m.status = 'finished';
  assert.equal(viewMatch(m).result?.winner, 'no-votes');
  m.votes = { a: 'human', b: 'human', c: 'ai' };
  assert.equal(viewMatch(m).result?.winner, 'contender'); assert.equal(viewMatch(m).result?.fooled, 2);
  m.votes = { a: 'human', b: 'ai' }; assert.equal(viewMatch(m).result?.winner, 'draw');
  m.votes.c = 'ai'; assert.equal(viewMatch(m).result?.winner, 'audience'); assert.equal(viewMatch(m).result?.identity, 'ai');
});
test('local password hashes are salted; invalid and unknown account checks reject', async () => {
  const a = await passwordHash('A long unique test passphrase'), b = await passwordHash('A long unique test passphrase');
  assert.notEqual(a, b); assert.ok(await passwordMatches('A long unique test passphrase', a));
  assert.equal(await passwordMatches('wrong', a), false); assert.equal(await passwordMatches('wrong'), false);
});
test('practice bot is deterministic and bounded', () => {
  assert.equal(practiceReply('Hello', 1), practiceReply('Hello', 1)); assert.ok(practiceReply('Hello?', 0).length < 1500);
});

test('AI matches randomize the human seat and never expose it before reveal', () => {
 const seats=new Set();
 for(let i=0;i<64;i++) {
  const m=createMatch('host','AI room','A meaningful conversation','ai'); seats.add(m.humanSeat);
  const audience=viewMatch(m,'spectator');
  assert.equal(audience.seat,'audience'); assert.equal(audience.ballot,'seat');
  assert.equal(audience.result,null); assert.ok(!JSON.stringify(audience).includes('humanSeat'));
  assert.equal(viewMatch(m,'host').seat,m.humanSeat);
  assert.throws(()=>addMessage(m,'spectator','No','id'));
 }
 assert.equal(seats.size,2);
});
test('seat ballots require the correct mode and score correctly for either assignment', () => {
 for(const humanSeat of ['a','b'] as const) {
  const m=createMatch('host','AI room','A meaningful conversation','ai'); m.humanSeat=humanSeat;
  m.status='voting'; m.votingEndsAt=Date.now()+60000;
  assert.throws(()=>vote(m,'host','a')); assert.throws(()=>vote(m,'observer','human'));
  vote(m,'observer',humanSeat); vote(m,'other',humanSeat);
  assert.throws(()=>vote(m,'observer',humanSeat==='a'?'b':'a'));
  assert.equal(viewMatch(m).result,null); finishIfDue(m,m.votingEndsAt);
  assert.equal(viewMatch(m).result?.humanSeat,humanSeat);
  assert.equal(viewMatch(m).result?.winner,'audience');
  assert.equal(viewMatch(m).result?.fooled,0);
 }
});
