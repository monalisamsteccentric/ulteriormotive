import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { currentUser, hashToken, sessionFor } from '../src/lib/auth';
import { emptyState, mutate, readState } from '../src/lib/store';
process.env.DATA_BACKEND='supabase'; process.env.SUPABASE_URL='https://synthetic.supabase.co';
process.env.SUPABASE_ANON_KEY='synthetic-anon'; process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service';
test('persistent Supabase session rotates expired credentials once under concurrent reads and rejects revocation',async t=>{
 let snapshot={version:1,data:emptyState()},refreshes=0,revoked=false;
 const user={id:randomUUID(),email:'synthetic@example.test',name:'Synthetic'};
 const jwt=(suffix:string)=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.'+suffix;
 const newToken=jwt('renewed');
 t.mock.method(globalThis,'fetch',async (input: string|URL|Request,init?: RequestInit)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.pathname==='/rest/v1/um_app_state') {
   if(init?.method==='PATCH') {
    const body=JSON.parse(String(init.body)),expected=Number(url.searchParams.get('version')?.slice(3));
    if(snapshot.version!==expected) return Response.json([]);
    snapshot=structuredClone(body); return Response.json([{version:snapshot.version}]);
   }
   return Response.json(structuredClone(snapshot));
  }
  if(url.pathname==='/auth/v1/token') {
   refreshes++; await new Promise(r=>setTimeout(r,20));
   return Response.json({access_token:newToken,refresh_token:'renewed-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user});
  }
  if(url.pathname==='/auth/v1/user') return revoked ? Response.json({message:'Revoked'},{status:401}) : Response.json(user);
  throw new Error('Unexpected synthetic request '+url.pathname);
 });
 await mutate(s=>s.users.push(user));
 const session=await sessionFor(user.id,jwt('expired'),Math.floor(Date.now()/1000)-1,'original-refresh');
 assert.ok(session.expiresAt>Date.now()+6*86400000);
 const req=new Request('https://game.ulteriormotive.club/api/auth/me',{headers:{cookie:'um_session='+session.token}});
 const results=await Promise.all([currentUser(req),currentUser(req)]);
 assert.equal(results[0]?.id,user.id); assert.equal(results[1]?.id,user.id); assert.equal(refreshes,1);
 const stored=(await readState()).sessions[hashToken(session.token)];
 assert.equal(stored.refreshToken,'renewed-refresh'); assert.equal(stored.providerToken,newToken);
 revoked=true; assert.equal(await currentUser(req),null);
 await mutate(s=>{delete s.sessions[hashToken(session.token)];});
 assert.equal(await currentUser(req),null);
});
