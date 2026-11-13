import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const temporary = await mkdtemp(join(tmpdir(), 'ulterior-tests-'));
const port = process.env.TEST_PORT || '3112', origin = `http://127.0.0.1:${port}`;
const database = join(temporary, 'test.sqlite');
let child, browser;
const errors = [], password = randomBytes(24).toString('base64url');
const screenshots = resolve('.local/previews');
let checks = 0;
const pass = (s) => { checks++; console.log(`PASS ${s}`); };
async function auth(context, name) {
  const r = await context.request.post(`${origin}/api/auth/register`, { headers: { origin }, data: { name, email: `${name.toLowerCase()}-${Date.now()}@example.test`, password } });
  assert.equal(r.status(), 200, await r.text());
  return (await r.json()).user;
}
try {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, APP_ORIGIN: origin, DATA_BACKEND: 'local', DATABASE_PATH: database, AI_MODE: 'openai', OPENAI_API_KEY: 'synthetic-browser-test-key', OPENAI_MODEL: 'synthetic-test-model', NODE_OPTIONS: `--require ${JSON.stringify(resolve('tests/fixtures/provider.cjs'))}`, NEXT_TELEMETRY_DISABLED: '1' } });
  child.stderr.on('data', (data) => errors.push(data.toString())); child.stdout.on('data', () => {});
  for (let i = 0; ; i++) { try { if ((await fetch(origin)).ok) break; } catch {} if (i > 100 || child.exitCode !== null) throw new Error(`Server did not start: ${errors.join('')}`); await new Promise((r) => setTimeout(r, 200)); }
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : process.platform === 'win32' ? { channel: 'chrome' } : {}) });
  const host = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), page = await host.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console',m=>{ if(m.type()==='error' && !m.text().startsWith('Failed to load resource')) pageErrors.push(m.text()); });
  await mkdir(screenshots, { recursive: true });
  for (const route of ['/', '/automation', ...['solution', 'capabilities', 'architecture', 'process', 'pricing', 'about', 'contact'].map((p) => `/automation/${p}`), '/game', '/game/rules', '/game/login']) {
    const r = await page.goto(origin + route); assert.equal(r.status(), 200, route); assert.ok(await page.locator('h1').count() >= 1, route);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `desktop overflow ${route}`);
  }
  for (const [hostname, heading] of [['game.ulteriormotive.club','Everyone has'],['automation.ulteriormotive.club','Your business'],['ulteriormotive.club','THE ULTERIOR MOTIVE COLLECTION'],['www.ulteriormotive.club','THE ULTERIOR MOTIVE COLLECTION']]) {
    const r=await host.request.get(origin+'/',{headers:{'x-forwarded-host':hostname}}); assert.equal(r.status(),200); assert.ok((await r.text()).includes(heading),hostname);
  }
  const clean=await host.request.get(origin+'/rules',{headers:{'x-forwarded-host':'game.ulteriormotive.club'}}); assert.equal(clean.status(),200);
  assert.ok((await clean.text()).includes('Find the human'));
  const map=await host.request.get(origin+'/sitemap.xml',{headers:{'x-forwarded-host':'automation.ulteriormotive.club'}});
  assert.ok((await map.text()).includes('https://automation.ulteriormotive.club/contact'));
  pass('real server forwarded-host routing, clean game paths and product sitemap');
  const domains=await browser.newContext();
  await domains.route(/^https:\/\/(?:game\.|automation\.|www\.)?ulteriormotive\.club\//,async route=>{
    const u=new URL(route.request().url());
    const response=await route.fetch({url:origin+u.pathname+u.search,headers:{...route.request().headers(),'x-forwarded-host':u.hostname}});
    await route.fulfill({response});
  });
  const productionPage=await domains.newPage();
  productionPage.on('pageerror',e=>pageErrors.push(e.message));
  await productionPage.goto('https://game.ulteriormotive.club/');
  await productionPage.getByRole('link',{name:'How to play',exact:true}).click();
  await productionPage.getByRole('heading',{name:/Find the human/}).waitFor();
  assert.equal(new URL(productionPage.url()).pathname,'/rules');
  await productionPage.getByRole('link',{name:/Automation/,exact:false}).first().click();
  await productionPage.getByRole('heading',{name:/Your business/}).waitFor();
  assert.equal(new URL(productionPage.url()).hostname,'automation.ulteriormotive.club');
  await productionPage.getByRole('link',{name:'Architecture',exact:true}).click();
  await productionPage.getByRole('heading',{name:/Connected by design/}).waitFor();
  assert.equal(new URL(productionPage.url()).pathname,'/architecture');
  const canonical=await productionPage.locator('link[rel=canonical]').getAttribute('href');
  assert.equal(canonical,'https://automation.ulteriormotive.club/architecture');
  await domains.close();
  pass('browser navigation on production hostnames through a local transport, clean paths and canonical URLs');

  pass('all 12 routes render, have headings and no desktop overflow');
  await page.goto(origin + '/automation'); await page.screenshot({ path: join(screenshots, 'automation-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/automation', '/automation/architecture', '/automation/pricing', '/automation/contact', '/game', '/game/login']) {
    await page.goto(origin + route); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `mobile overflow ${route}`);
  }
  await page.goto(origin + '/automation'); await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('navigation', { name: 'Automation navigation' }).getByRole('link', { name: 'Architecture' }).click();
  await page.getByRole('heading', { name: /Connected by design/ }).waitFor();
  await page.screenshot({ path: join(screenshots, 'automation-mobile.png'), fullPage: true });
  pass('mobile layouts and real collapsed-menu navigation');
  await page.goto(origin + '/automation/contact');
  const contactButton = page.getByRole('button', { name: /Start the conversation/ }); await contactButton.click();
  assert.equal(await page.locator('input[name=name]').evaluate((n) => n.validity.valid), false);
  await page.getByLabel('Your name').fill('Test operator'); await page.getByLabel('Work email').fill('operator@example.test');
  await page.getByLabel('Company', { exact: true }).fill('Synthetic company');
  await page.getByLabel('Your role').fill('Operations lead');
  await page.getByLabel('Project requirements').fill('Integrate ticket intake with our CRM and reporting systems.');
  await page.getByLabel('Business problem / what would you like to make work better?').fill('Connect our internal ticket intake, approved review process and operational reporting.');
  await contactButton.click(); await page.getByRole('status').filter({ hasText: 'Email delivery is not configured' }).waitFor();
  const checkDb = new DatabaseSync(database); const contactState = JSON.parse(checkDb.prepare('SELECT data FROM um_state WHERE id=1').get().data); checkDb.close();
  assert.equal(contactState.inquiries.length, 1); assert.equal(contactState.inquiries[0].company, 'Synthetic company');
  pass('contact browser validation, honest confirmation and durable saved record');
  assert.equal((await host.request.post(origin + '/api/contact', { headers: { origin: 'https://evil.example' }, data: {} })).status(), 403);
  assert.equal((await host.request.post(origin + '/api/contact', { headers: { origin }, data: { name: 'Spam', email: 'spam@example.test', company: 'Spam', role:'Manager', requirements:'A sufficiently long project description.', message: 'This has enough characters for a request.', website: 'spam.example' } })).status(), 400);
  assert.equal((await host.request.post(origin + '/api/contact', { headers: { origin }, data: { message: 'x'.repeat(20000) } })).status(), 413);
  pass('API rejects CSRF, honeypot submission and oversized JSON');
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(origin + '/game/login');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  const hostEmail=`host-${Date.now()}@example.test`;
  await page.getByLabel('Display name').fill('Host'); await page.getByLabel('Email', { exact: true }).fill(hostEmail);
  await page.getByLabel('Password', { exact: false }).fill(password); await page.getByRole('button', { name: /Create your account/ }).click();
  await page.waitForURL(origin + '/game'); await page.getByRole('button', { name: 'Take a seat' }).click();
  await page.getByLabel('Room name').fill('The quiet detail'); await page.getByLabel('Conversation prompt').fill('What is a small detail that made you change your mind?');
  await page.getByLabel('Opponent', { exact: true }).selectOption('human'); await page.getByRole('button', { name: /Open the room/ }).click();
  await page.waitForURL(/\/game\/matches\//); const matchUrl = page.url(), id = matchUrl.split('/').at(-1);
  const guest = await browser.newContext(), observer = await browser.newContext(); await auth(guest, 'Guest'); await auth(observer, 'Observer');
  const guestPage = await guest.newPage(); await guestPage.goto(matchUrl);
  await guestPage.getByRole('button', { name: /Join as Contender 02/ }).click();
  await page.getByLabel('Your message').waitFor(); await page.waitForFunction(() => !document.querySelector('#message')?.disabled);
  await page.getByLabel('Your message').fill('I once changed my entire plan because the cafe was closed. What detail sticks with you?');
  await page.getByRole('button', { name: 'Send ↗', exact: true }).click();
  await guestPage.waitForFunction(() => !document.querySelector('#message')?.disabled);
  await guestPage.getByLabel('Your message').fill('The sound of a train leaving before I reached the platform. I started leaving earlier after that.');
  await guestPage.getByRole('button', { name: 'Send ↗', exact: true }).click();
  const observerPage = await observer.newPage(); await observerPage.goto(matchUrl);
  await observerPage.getByText('The sound of a train leaving before I reached the platform.', { exact: false }).waitFor();
  const hidden = await (await observer.request.get(`${origin}/api/matches/${id}`)).json();
  assert.equal(hidden.match.result, null); assert.ok(!('opponent' in hidden.match)); assert.ok(!('hostId' in hidden.match));
  assert.equal((await observer.request.post(`${origin}/api/matches/${id}/message`, { headers: { origin }, data: { id: crypto.randomUUID(), text: 'Unauthorized spectator message' } })).status(), 403);
  pass('real registration, human-room creation/join, two-player alternating chat and private identity projection');
  await page.screenshot({ path: join(screenshots, 'game-room-desktop.png'), fullPage: true });
  page.once('dialog', (d) => d.accept()); await page.getByRole('button', { name: /Open the audience vote/ }).click();
  await observerPage.getByRole('button', { name: 'Human', exact: true }).waitFor();
  const race = await Promise.all(['human', 'ai'].map((choice) => observer.request.post(`${origin}/api/matches/${id}/vote`, { headers: { origin }, data: { choice } })));
  assert.deepEqual(race.map((r) => r.status()).sort(), [200, 409]);
  assert.equal((await host.request.post(`${origin}/api/matches/${id}/vote`, { headers: { origin }, data: { choice: 'human' } })).status(), 403);
  pass('one immutable vote under concurrency; contenders cannot vote; voting lasts a real 60 seconds');
  const aiCreated=await host.request.post(origin+'/api/matches',{headers:{origin},data:{title:'Human versus AI',topic:'What makes a small detail memorable?',opponent:'ai'}});
  assert.equal(aiCreated.status(),201); const ai=(await aiCreated.json()).match;
  assert.equal(ai.ballot,'seat'); assert.notEqual(ai.seat,'audience');
  const aiId=ai.id, humanSeat=ai.seat;
  const aiAudience=await (await observer.request.get(`${origin}/api/matches/${aiId}`)).json();
  assert.equal(aiAudience.match.result,null); assert.equal(aiAudience.match.seat,'audience'); assert.ok(!('humanSeat' in aiAudience.match));
  await page.goto(origin+`/game/matches/${aiId}`);
  await page.waitForFunction(()=>!document.querySelector('#message')?.disabled);
  await page.getByLabel('Your message').fill('I remember the smell of rain on the road. Which detail do you remember?');
  await page.getByRole('button',{name:'Send \u2197',exact:true}).click();
  await page.getByRole('button',{name:/Open the audience vote/}).waitFor();
  page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:/Open the audience vote/}).click();
  await observerPage.goto(origin+`/game/matches/${aiId}`);
  await observerPage.getByRole('button',{name:'Contender 01',exact:true}).waitFor();
  await observerPage.getByRole('button',{name:humanSeat==='a'?'Contender 01':'Contender 02',exact:true}).click();
  await observerPage.getByRole('status').filter({hasText:'Your vote is locked'}).waitFor();
  pass('AI-mode browser conversation, privately assigned seat, host control and audience seat ballot (provider test double)');
  await page.goto(matchUrl);
  await page.getByRole('heading', { name: 'The reveal.', exact: true }).waitFor({ timeout: 75000 });
  const result = await (await observer.request.get(`${origin}/api/matches/${id}`)).json();
  assert.equal(result.match.status, 'finished'); assert.equal(result.match.result.identity, 'human'); assert.equal(result.match.voteCount, 1);
  pass('real server deadline, persistent reveal and accurate final vote count');
  await observerPage.getByRole('heading',{name:'The reveal.',exact:true}).waitFor({timeout:75000});
  const aiResult=(await (await observer.request.get(`${origin}/api/matches/${aiId}`)).json()).match;
  assert.equal(aiResult.result.humanSeat,humanSeat); assert.equal(aiResult.result.winner,'audience'); assert.equal(aiResult.result.humanVotes,1);
  pass('AI reveal names the correct human seat and scores the audience ballot after the real deadline');

  // Practice mode is exercised separately, without claiming that its scripted replies are a model.
  const practice = await (await host.request.post(origin + '/api/matches', { headers: { origin }, data: { title: 'Scripted practice', topic: 'A synthetic practice room for tests.', opponent: 'practice' } })).json();
  const messageId = crypto.randomUUID();
  const send = () => host.request.post(`${origin}/api/matches/${practice.match.id}/message`, { headers: { origin }, data: { text: 'What do you notice first?', id: messageId } });
  assert.equal((await send()).status(), 200); assert.equal((await send()).status(), 200);
  const bot = await (await host.request.get(`${origin}/api/matches/${practice.match.id}`)).json(); assert.equal(bot.match.messages.length, 2);
  await page.goto(origin + '/game'); await page.screenshot({ path: join(screenshots, 'game-lobby-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('link', { name: 'Join the experiment ↗', exact: true }).waitFor();
  assert.equal((await host.request.post(origin + '/api/matches', { headers: { origin }, data: {} })).status(), 401);
  pass('scripted practice, idempotent message replay and server-side logout revocation');
  await page.goto(origin+'/game/login');
  await page.getByLabel('Email',{exact:true}).fill(hostEmail); await page.getByLabel('Password').fill(password);
  await page.getByRole('button',{name:/Take your seat/}).click(); await page.waitForURL(origin+'/game');
  await page.reload(); await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  assert.ok((await (await host.request.get(origin+'/api/auth/me')).json()).user);
  pass('password login and persistent account session after page reload');
  assert.ok(!errors.some(e=>e.includes('Application request failed:')),errors.join(''));

  assert.deepEqual(pageErrors, []); pass('no browser page exceptions');
  console.log(`${checks} browser/integration checks passed. Screenshots: .local/previews. Supabase Auth and live AI calls not exercised; AI network boundary uses an isolated test double.`);
} finally {
  try { await browser?.close(); } finally {
    if (child && child.exitCode === null) { const stopped = new Promise((r) => child.once('exit', r)); child.kill(); await stopped; }
    const target = resolve(temporary);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('ulterior-tests-')) throw new Error('Refused unowned temp cleanup.');
    await rm(target, { recursive: true, force: true });
  }
}
