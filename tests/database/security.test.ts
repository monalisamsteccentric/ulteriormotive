import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/202609190001_initial.sql",
    import.meta.url,
  ),
  "utf8",
).replace("create extension if not exists pgcrypto;", "");
const person = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const first = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const second = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function setup() {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  await db.exec(migration);
  await db.exec(
    `insert into auth.users values ('${person}'),('${other}'); insert into public.participants(id,alias,consent_version) values ('${person}','Mira','2026-09-19'),('${other}','Lee','2026-09-19'); insert into public.content(id,title,url,category,enabled) values ('${first}','First discovery','https://example.com/1','Read',true),('${second}','Second discovery','https://example.com/2','Watch',true);`,
  );
  return db;
}
test("duplicates never inflate progress; disabled and hidden access is denied", async () => {
  const db = await setup();
  try {
    const visit = () =>
      db.query<{ record_visit: number }>("select public.record_visit($1,$2)", [
        person,
        first,
      ]);
    assert.equal((await visit()).rows[0].record_visit, 1);
    assert.equal((await visit()).rows[0].record_visit, 1);
    await db.query("update public.content set enabled=false where id=$1", [
      second,
    ]);
    await assert.rejects(
      db.query("select public.record_visit($1,$2)", [person, second]),
      /Content unavailable/,
    );
    await db.query(
      "update public.participants set status='hidden' where id=$1",
      [person],
    );
    await assert.rejects(visit(), /Participant unavailable/);
  } finally {
    await db.close();
  }
});
test("anonymous and authenticated clients cannot access tables or privileged functions", async () => {
  const db = await setup();
  try {
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      for (const table of [
        "admins",
        "participants",
        "content",
        "visits",
        "admin_photos",
        "rate_limits",
      ])
        await assert.rejects(
          db.query("select * from public." + table),
          /permission denied/,
        );
      await assert.rejects(
        db.query("select public.record_visit($1,$2)", [person, first]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.consume_rate_limit('x',100,60)"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.discovery_analytics()"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("insert into public.admins(user_id) values($1)", [person]),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
test("rate limits are enforced and expired windows restart", async () => {
  const db = await setup();
  try {
    const take = () =>
      db.query<{ consume_rate_limit: boolean }>(
        "select public.consume_rate_limit('test',2,60)",
      );
    assert.equal((await take()).rows[0].consume_rate_limit, true);
    assert.equal((await take()).rows[0].consume_rate_limit, true);
    assert.equal((await take()).rows[0].consume_rate_limit, false);
    await db.exec(
      "update public.rate_limits set expires_at=now()-interval '1 minute'",
    );
    assert.equal((await take()).rows[0].consume_rate_limit, true);
  } finally {
    await db.close();
  }
});
test("ordering is complete and transactional; invalid reorders change nothing", async () => {
  const db = await setup();
  try {
    await db.query("select public.reorder_content($1::uuid[])", [
      [second, first],
    ]);
    assert.deepEqual(
      (
        await db.query<{ id: string }>(
          "select id from public.content order by position",
        )
      ).rows.map((r) => r.id),
      [second, first],
    );
    await assert.rejects(
      db.query("select public.reorder_content($1::uuid[])", [[first, first]]),
      /Content changed/,
    );
    await assert.rejects(
      db.query("select public.reorder_content($1::uuid[])", [[first]]),
      /Content changed/,
    );
    assert.deepEqual(
      (
        await db.query<{ id: string }>(
          "select id from public.content order by position",
        )
      ).rows.map((r) => r.id),
      [second, first],
    );
  } finally {
    await db.close();
  }
});
test("deleting content keeps earned growth; deleting an account cascades its personal records", async () => {
  const db = await setup();
  try {
    await db.query("select public.record_visit($1,$2)", [person, first]);
    await db.query("delete from public.content where id=$1", [first]);
    assert.equal(
      (
        await db.query<{ discoveries: number }>(
          "select discoveries from public.participants where id=$1",
          [person],
        )
      ).rows[0].discoveries,
      1,
    );
    await db.query("delete from auth.users where id=$1", [person]);
    assert.equal(
      (
        await db.query("select * from public.participants where id=$1", [
          person,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("select * from public.visits where participant_id=$1", [
          person,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.participants where id=$1", [other]))
        .rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
