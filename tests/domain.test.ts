import test from "node:test";
import assert from "node:assert/strict";
import {
  progress,
  safeExternalUrl,
  contentSchema,
  joinSchema,
} from "../lib/domain";
test("milestones grow only at intended thresholds", () => {
  assert.equal(progress(0).name, "New spark");
  assert.equal(progress(1).name, "Curious mind");
  assert.equal(progress(2).size, 1);
  assert.equal(progress(3).size, 2);
  assert.equal(progress(6).name, "Trailblazer");
  assert.equal(progress(9).size, 2);
  assert.equal(progress(10).size, 3);
  assert.equal(progress(100).next, null);
  assert.equal(progress(100).percent, 100);
  assert.equal(progress(4).percent, 33);
});
test("reject script, credential, local and non-HTTPS destinations", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://a:b@example.com",
    "https://localhost/test",
    "https://127.0.0.1",
    "https://[::1]",
    "https://test.internal",
    "/relative",
    "https://2130706433",
  ])
    assert.equal(safeExternalUrl(url), false, url);
  assert.equal(safeExternalUrl("https://example.com/article?q=hello"), true);
});
test("consent and safe names are required", () => {
  assert.equal(
    joinSchema.safeParse({ alias: "Mira", avatar: "mint", consent: true })
      .success,
    true,
  );
  assert.equal(
    joinSchema.safeParse({ alias: "Mira", avatar: "mint", consent: false })
      .success,
    false,
  );
  assert.equal(
    joinSchema.safeParse({ alias: "<script>", avatar: "mint", consent: true })
      .success,
    false,
  );
});
test("content validates ranges, category and safe URLs", () => {
  const good = {
    title: "New perspectives",
    description: "A fresh idea",
    url: "https://example.com",
    category: "Read",
    duration_minutes: 5,
    position: 0,
    enabled: false,
  };
  assert.equal(contentSchema.safeParse(good).success, true);
  for (const patch of [
    { duration_minutes: 0 },
    { position: -1 },
    { category: "unknown" },
    { url: "javascript:alert(1)" },
  ])
    assert.equal(contentSchema.safeParse({ ...good, ...patch }).success, false);
});
