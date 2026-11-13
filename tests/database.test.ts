import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('additive migration preserves records; RLS, constraints and immutable votes execute in PostgreSQL', async () => {
 const db=new PGlite();
 try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile('supabase/migrations/001_initial.sql','utf8'));
  const host=randomUUID(),observer=randomUUID(),id=randomUUID(),inquiry=randomUUID();
  const state={users:[{id:host,email:'host@example.test',name:'Host'},{id:observer,email:'observer@example.test',name:'Observer'}],sessions:{},rates:{},inquiries:[{id:inquiry,name:'Buyer',email:'buyer@example.test',company:'Example',message:'An existing inquiry is preserved.',at:Date.now()}],matches:[{id,title:'An AI match',topic:'Tell us a story',hostId:host,guestId:null,opponent:'ai',humanSeat:'b',status:'voting',messages:[{id:randomUUID(),seat:'a',text:'What made you curious?',at:Date.now()}],turn:'b',votes:{[observer]:'b'},votingEndsAt:Date.now()+60000,createdAt:Date.now(),version:1}]};
  await db.query('UPDATE um_app_state SET data=$1::jsonb WHERE id=1',[JSON.stringify(state)]);
  await db.exec(await readFile('supabase/migrations/002_relational_records.sql','utf8'));
  assert.equal((await db.query('SELECT * FROM um_enterprise_inquiries')).rows.length,1);
  assert.equal((await db.query('SELECT * FROM um_participants')).rows.length,2);
  assert.equal((await db.query('SELECT * FROM um_votes')).rows.length,1);
  const tables=['um_app_state','um_profiles','um_matches','um_participants','um_messages','um_votes','um_match_results','um_enterprise_inquiries'];
  const rls=await db.query<{relname:string;relrowsecurity:boolean}>('SELECT relname,relrowsecurity FROM pg_class WHERE relname=ANY($1)',[tables]);
  assert.equal(rls.rows.length,tables.length); assert.ok(rls.rows.every(r=>r.relrowsecurity));
  for(const role of ['anon','authenticated']) {
   await db.exec('SET ROLE '+role);
   for(const table of tables) await assert.rejects(db.query('SELECT * FROM '+table),/permission denied/);
   await assert.rejects(db.query('UPDATE um_app_state SET version=version+1'),/permission denied/);
   await db.exec('RESET ROLE');
  }
  state.matches[0].votes[observer]='a';
  await assert.rejects(db.query('UPDATE um_app_state SET data=$1::jsonb WHERE id=1',[JSON.stringify(state)]),/Immutable ballot/);
  state.matches[0].votes[observer]='b'; state.matches[0].votes[host]='a';
  await assert.rejects(db.query('UPDATE um_app_state SET data=$1::jsonb WHERE id=1',[JSON.stringify(state)]),/Participant cannot vote/);
  delete state.matches[0].votes[host]; state.matches[0].status='finished';
  await db.query('UPDATE um_app_state SET data=$1::jsonb WHERE id=1',[JSON.stringify(state)]);
  const result=await db.query<{winner:string;correct_votes:number}>('SELECT winner,correct_votes FROM um_match_results');
  assert.equal(result.rows[0].winner,'audience'); assert.equal(result.rows[0].correct_votes,1);
  await assert.rejects(db.query('INSERT INTO um_votes VALUES($1,$2,$3)',[id,observer,'a']),/duplicate key/);
  await db.exec('SET ROLE service_role');
  await assert.rejects(db.query('INSERT INTO um_votes VALUES($1,$2,$3)',[id,host,'a']),/permission denied/);
  await db.exec('RESET ROLE');
 } finally { await db.close(); }
});
