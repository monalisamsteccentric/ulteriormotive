import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createMatch, addMessage } from '../src/lib/game';
import { mutate, readState } from '../src/lib/store';
import { botReply } from '../src/lib/opponent';
const temp=mkdtempSync(join(tmpdir(),'um-opponent-'));
process.env.DATA_BACKEND='local'; process.env.DATABASE_PATH=join(temp,'test.sqlite');
process.env.AI_MODE='openai'; process.env.OPENAI_API_KEY='synthetic-test-key'; process.env.OPENAI_MODEL='test-model';
process.on('exit',()=>{try{rmSync(temp,{recursive:true,force:true});}catch{ /* Windows may retain SQLite handles until exit. */ }});
test('model lease prevents duplicate generations and saves one anonymous reply', async t => {
 const m=createMatch(randomUUID(),'AI test','A synthetic model conversation','ai'); m.humanSeat='a';
 addMessage(m,m.hostId,'What is curiosity?',randomUUID()); await mutate(s=>s.matches.push(m));
 let calls=0;
 t.mock.method(globalThis,'fetch',async (_input: unknown, init?: RequestInit)=>{
  calls++; const body=JSON.parse(String(init?.body)); assert.equal(body.store,false); assert.equal(body.model,'test-model');
  await new Promise(r=>setTimeout(r,20));
  return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Perhaps it starts with noticing something small.'}]}]});
 });
 await Promise.all([botReply(m.id),botReply(m.id)]);
 const current=(await readState()).matches.find(v=>v.id===m.id)!;
 assert.equal(calls,1); assert.equal(current.messages.length,2); assert.equal(current.turn,'a');
 assert.match(current.messages[1].id,/^[a-f0-9-]{36}$/); assert.equal(current.generation,undefined);
});
test('provider failure keeps the human message and releases lease for retry',async t=>{
 const m=createMatch(randomUUID(),'AI failure','A synthetic model conversation','ai'); m.humanSeat='a';
 addMessage(m,m.hostId,'Can you hear me?',randomUUID()); await mutate(s=>s.matches.push(m));
 t.mock.method(globalThis,'fetch',async ()=>new Response('{}',{status:503}));
 await assert.rejects(botReply(m.id),/AI did not respond/);
 let current=(await readState()).matches.find(v=>v.id===m.id)!; assert.equal(current.messages.length,1);assert.equal(current.generation,undefined);
 t.mock.restoreAll();
 t.mock.method(globalThis,'fetch',async ()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:'I can hear you now.'}]}]}));
 await botReply(m.id); current=(await readState()).matches.find(v=>v.id===m.id)!; assert.equal(current.messages.length,2);
});
