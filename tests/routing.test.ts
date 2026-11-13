import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware as proxy } from '../src/middleware';
import { productPath, trustedHost } from '../src/lib/routing';
test('both exact product hosts rewrite independently behind Amplify', () => {
 for (const [host,prefix] of [['game.ulteriormotive.club','/game'],['automation.ulteriormotive.club','/automation']]) {
  const r=proxy(new NextRequest('https://internal.amplifyapp.com/', {headers:{host:'internal.amplifyapp.com','x-forwarded-host':host}}));
  assert.equal(new URL(r.headers.get('x-middleware-rewrite')!).pathname,prefix);
 }
});
test('prefixes canonicalize without loops; similar hostnames and path prefixes are not accepted', () => {
 const r=proxy(new NextRequest('https://game.ulteriormotive.club/game/rules?from=lobby',{headers:{host:'game.ulteriormotive.club'}}));
 assert.equal(r.headers.get('location'),'https://game.ulteriormotive.club/rules?from=lobby');
 const next=proxy(new NextRequest(r.headers.get('location')!,{headers:{host:'game.ulteriormotive.club'}}));
 assert.equal(new URL(next.headers.get('x-middleware-rewrite')!).pathname,'/game/rules');
 assert.equal(trustedHost(new Headers({host:'localhost:3100','x-forwarded-host':'game.ulteriormotive.club.evil.test'})),'localhost');
 const brand=proxy(new NextRequest('https://ulteriormotive.club/',{headers:{host:'ulteriormotive.club'}}));
 assert.equal(brand.headers.get('x-middleware-rewrite'),null);
});
test('API and assets bypass rewriting; cross-product links go to the right domain', () => {
 for(const path of ['/api/auth/me','/_next/static/test.js','/robots.txt','/sitemap.xml']) {
  const r=proxy(new NextRequest('https://game.ulteriormotive.club'+path,{headers:{host:'game.ulteriormotive.club'}}));
  assert.equal(r.headers.get('x-middleware-rewrite'),null);
 }
 assert.equal(productPath('/game/matches/123','game.ulteriormotive.club'),'/matches/123');
 assert.equal(productPath('/automation/contact','game.ulteriormotive.club'),'https://automation.ulteriormotive.club/contact');
 assert.equal(productPath('/game','ulteriormotive.club'),'https://game.ulteriormotive.club/');
 assert.equal(productPath('/','game.ulteriormotive.club'),'https://ulteriormotive.club/');
 assert.equal(productPath('/game','localhost'),'/game');
});
