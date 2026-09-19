import test from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import { GET, POST, PATCH, DELETE } from "../../app/api/[...path]/route";
const participant = "11111111-1111-4111-8111-111111111111";
const admin = "22222222-2222-4222-8222-222222222222";
const ordinary = "33333333-3333-4333-8333-333333333333";
type Call = { path: string; method: string; body: unknown };
let calls: Call[] = [];
let allowed = true;
let person: Record<string, unknown> | null = null;
let authDeleteFails = false;
let storageBytes: Buffer | null = null;
async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, "http://localhost");
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  let body: unknown = null;
  if (req.headers["content-type"]?.includes("application/json") && bytes.length)
    body = JSON.parse(bytes.toString());
  calls.push({ path: url.pathname, method: req.method!, body });
  function send(value: unknown, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(value));
  }
  if (url.pathname === "/auth/v1/user") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (
      !["participant-token", "admin-token", "ordinary-token"].includes(
        token ?? "",
      )
    )
      return send({ message: "Invalid token" }, 401);
    return send({
      id:
        token === "admin-token"
          ? admin
          : token === "ordinary-token"
            ? ordinary
            : participant,
      is_anonymous: token === "participant-token",
      aud: "authenticated",
      role: "authenticated",
    });
  }
  if (url.pathname.startsWith("/auth/v1/admin/users/"))
    return send(
      authDeleteFails
        ? { message: "Temporary outage" }
        : { user: { id: participant } },
      authDeleteFails ? 503 : 200,
    );
  if (url.pathname === "/rest/v1/admins")
    return send(
      url.searchParams.get("user_id") === "eq." + admin
        ? [{ user_id: admin }]
        : [],
    );
  if (url.pathname === "/rest/v1/rpc/consume_rate_limit") return send(allowed);
  if (url.pathname === "/rest/v1/participants") {
    if (req.method === "POST") {
      person = body as Record<string, unknown>;
      return send(person);
    }
    if (req.method === "PATCH") {
      person = { ...person, ...(body as object) };
      return send(
        req.headers.accept?.includes("vnd.pgrst.object") ? person : [person],
      );
    }
    return send(person ? [person] : []);
  }
  if (url.pathname === "/rest/v1/visits") return send([]);
  if (url.pathname === "/rest/v1/content") return send([]);
  if (url.pathname.startsWith("/storage/v1/object/list/"))
    return send([{ name: "old.webp" }]);
  if (url.pathname.startsWith("/storage/v1/object/") && req.method === "POST") {
    storageBytes = bytes;
    return send({ Key: "uploaded" });
  }
  if (url.pathname.startsWith("/storage/v1/object/") && req.method === "DELETE")
    return send([]);
  return send({ message: "Unhandled mock endpoint: " + url.pathname }, 500);
}
test("API security and data handling against a fake Supabase HTTP service", async (t) => {
  const server = createServer((req, res) => {
    handler(req, res).catch(() => {
      res.writeHead(500);
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-server-key";
  async function call(
    path: string,
    method = "GET",
    token?: string,
    body?: unknown,
  ) {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = "Bearer " + token;
    if (body !== undefined && !(body instanceof FormData))
      headers["content-type"] = "application/json";
    const request = new Request("http://app.test/api/" + path, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    const route =
      method === "GET"
        ? GET
        : method === "PATCH"
          ? PATCH
          : method === "DELETE"
            ? DELETE
            : POST;
    return route(request, {
      params: Promise.resolve({ path: path.split("/") }),
    });
  }
  try {
    await t.test("missing and forged access tokens are rejected", async () => {
      assert.equal((await call("me")).status, 401);
      assert.equal((await call("me", "GET", "forged")).status, 401);
    });
    await t.test(
      "ordinary and anonymous users cannot invoke admin routes",
      async () => {
        assert.equal(
          (await call("admin/content", "POST", "ordinary-token", {})).status,
          403,
        );
        assert.equal(
          (await call("admin/content", "POST", "participant-token", {})).status,
          403,
        );
        assert.equal(
          (await call("admin/content", "POST", "admin-token", {})).status,
          400,
        );
      },
    );
    await t.test(
      "consent required; participant identity and privilege fields cannot be supplied",
      async () => {
        assert.equal(
          (
            await call("join", "POST", "participant-token", {
              alias: "Mira",
              avatar: "mint",
              consent: false,
            })
          ).status,
          400,
        );
        const response = await call("join", "POST", "participant-token", {
          id: ordinary,
          alias: "Mira",
          avatar: "mint",
          consent: true,
          status: "approved",
          discoveries: 999,
        });
        assert.equal(response.status, 200);
        assert.equal(person?.id, participant);
        assert.equal(person?.discoveries, undefined);
        assert.equal(person?.consent_version, "2026-09-19");
      },
    );
    await t.test(
      "rate limiting returns a retry header and does not mutate data",
      async () => {
        allowed = false;
        calls = [];
        const response = await call("join", "POST", "participant-token", {
          alias: "Mira",
          avatar: "mint",
          consent: true,
        });
        assert.equal(response.status, 429);
        assert.equal(response.headers.get("retry-after"), "60");
        assert.equal(
          calls.some((c) => c.path === "/rest/v1/participants"),
          false,
        );
        allowed = true;
      },
    );
    await t.test("invalid image bytes never reach storage", async () => {
      const form = new FormData();
      form.set(
        "photo",
        new File(["not an image"], "photo.png", { type: "image/png" }),
      );
      calls = [];
      person = { id: participant, photo_path: null, status: "approved" };
      const response = await call("avatar", "POST", "participant-token", form);
      assert.equal(response.status, 400);
      assert.equal(
        calls.some((c) => c.path.startsWith("/storage/")),
        false,
      );
    });
    await t.test(
      "images are converted and stored under the authenticated user's identity",
      async () => {
        person = { id: participant, photo_path: null, status: "approved" };
        const source = await sharp({
          create: { width: 20, height: 20, channels: 3, background: "#c4dcae" },
        })
          .png()
          .toBuffer();
        const form = new FormData();
        form.set(
          "photo",
          new File([new Uint8Array(source)], "photo.png", {
            type: "image/png",
          }),
        );
        calls = [];
        const response = await call(
          "avatar",
          "POST",
          "participant-token",
          form,
        );
        assert.equal(response.status, 200);
        assert.ok(
          calls.some((c) =>
            c.path.startsWith(
              "/storage/v1/object/participant-photos/" + participant + "/",
            ),
          ),
        );
        assert.equal((await sharp(storageBytes!).metadata()).format, "webp");
        assert.equal((await sharp(storageBytes!).metadata()).width, 640);
        assert.equal(person?.status, "pending");
      },
    );
    await t.test(
      "hidden participants cannot upload around moderation",
      async () => {
        person = { id: participant, photo_path: null, status: "hidden" };
        const form = new FormData();
        form.set(
          "photo",
          new File(["image"], "photo.png", { type: "image/png" }),
        );
        assert.equal(
          (await call("avatar", "POST", "participant-token", form)).status,
          403,
        );
      },
    );
    await t.test(
      "deletion hides first and can be retried after an Auth failure",
      async () => {
        person = {
          id: participant,
          photo_path: participant + "/old.webp",
          status: "approved",
        };
        calls = [];
        authDeleteFails = true;
        assert.equal(
          (await call("account", "DELETE", "participant-token")).status,
          503,
        );
        assert.equal(person?.status, "hidden");
        const hide = calls.findIndex(
          (c) => c.path === "/rest/v1/participants" && c.method === "PATCH",
        );
        const storage = calls.findIndex(
          (c) =>
            c.path.startsWith("/storage/v1/object/") && c.method === "DELETE",
        );
        const auth = calls.findIndex((c) =>
          c.path.startsWith("/auth/v1/admin/users/"),
        );
        assert.ok(hide >= 0 && storage > hide && auth > storage);
        authDeleteFails = false;
        assert.equal(
          (await call("account", "DELETE", "participant-token")).status,
          200,
        );
        assert.equal(
          (await call("account", "DELETE", "admin-token")).status,
          403,
        );
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
