import { NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { ZodError, z } from "zod";
import { CONSENT_VERSION, contentSchema, joinSchema, uuid } from "@/lib/domain";
import {
  checked,
  database,
  HttpError,
  identity,
  jsonBody,
  limit,
  signPhoto,
} from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function bounded(request: Request) {
  if (!request.body || ["GET", "HEAD", "DELETE"].includes(request.method))
    return request;
  const maximum = request.headers
    .get("content-type")
    ?.includes("multipart/form-data")
    ? 6 * 1024 * 1024
    : 16384;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new HttpError(
        413,
        "Request is too large. Images must be under 5 MB.",
      );
    }
    chunks.push(chunk.value);
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: new Uint8Array(Buffer.concat(chunks)),
  });
}

async function upload(request: Request, bucket: string, owner: string) {
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024)
    throw new HttpError(400, "Choose an image smaller than 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new HttpError(400, "Use a JPG, PNG, or WebP image.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let converted: Buffer;
  try {
    const input = sharp(bytes, {
      limitInputPixels: 25000000,
      animated: false,
      failOn: "warning",
    });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
      throw new Error("Unsupported image");
    converted = await input
      .rotate()
      .resize(640, 640, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "That image could not be read. Use a JPG, PNG, or WebP under 25 megapixels.",
    );
  }
  const path = owner + "/" + randomUUID() + ".webp";
  checked(
    await database()
      .storage.from(bucket)
      .upload(path, converted, { contentType: "image/webp", upsert: false }),
  );
  return { path, form };
}
async function removePhoto(bucket: string, path: string | null) {
  if (path) checked(await database().storage.from(bucket).remove([path]));
}
async function participantView(row: Record<string, unknown> | null) {
  if (!row) throw new HttpError(404, "Participant not found.");
  const {
    photo_path,
    consent_version: _version,
    consented_at: _at,
    ...rest
  } = row;
  void _version;
  void _at;
  return {
    ...rest,
    photo_url: await signPhoto(
      "participant-photos",
      photo_path as string | null,
    ),
  };
}
async function publicData(request: Request) {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "public";
  await limit("public:" + forwarded, 120);
  const db = database();
  const [peopleResult, photoResult, contentResult, countResult] =
    await Promise.all([
      db
        .from("participants")
        .select("id,alias,avatar,photo_path,discoveries")
        .eq("status", "approved")
        .order("discoveries", { ascending: false })
        .order("id")
        .limit(120),
      db
        .from("admin_photos")
        .select("id,caption,photo_path")
        .eq("enabled", true)
        .order("position")
        .order("id")
        .limit(40),
      db
        .from("content")
        .select("*")
        .eq("enabled", true)
        .order("position")
        .order("id")
        .limit(500),
      db
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);
  const people = checked(peopleResult) ?? [];
  const photos = checked(photoResult) ?? [];
  checked(countResult);
  return {
    tiles: await Promise.all([
      ...people.map((p) => participantView(p)),
      ...photos.map(async (p) => ({
        id: p.id,
        alias: p.caption,
        avatar: "violet",
        discoveries: 0,
        editorial: true,
        photo_url: await signPhoto("admin-photos", p.photo_path),
      })),
    ]),
    content: checked(contentResult),
    count: countResult.count ?? 0,
  };
}

async function handle(request: Request, segments: string[]) {
  const path = segments.join("/");
  const method = request.method;
  if (method === "GET" && path === "public") return publicData(request);
  const admin = segments[0] === "admin";
  const { db, user } = await identity(request, admin);
  await limit(
    user.id + ":" + (admin ? "admin" : "participant"),
    admin ? 120 : 90,
  );
  if (admin) {
    if (method === "GET" && path === "admin") {
      const page = Math.max(
        0,
        Math.min(
          10000,
          Number(new URL(request.url).searchParams.get("page")) || 0,
        ),
      );
      const [c, p, a, analytics] = await Promise.all([
        db.from("content").select("*").order("position").order("id").limit(500),
        db
          .from("participants")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id")
          .range(page * 50, page * 50 + 49),
        db
          .from("admin_photos")
          .select("*")
          .order("position")
          .order("id")
          .limit(100),
        db.rpc("discovery_analytics"),
      ]);
      return {
        content: checked(c),
        participants: await Promise.all(
          (checked(p) ?? []).map(participantView),
        ),
        photos: await Promise.all(
          (checked(a) ?? []).map(async ({ photo_path, ...photo }) => ({
            ...photo,
            photo_url: await signPhoto("admin-photos", photo_path),
          })),
        ),
        analytics: checked(analytics),
        page,
      };
    }
    if (path === "admin/order" && method === "PUT") {
      const values = z
        .object({ ids: z.array(uuid).max(500) })
        .parse(await jsonBody(request));
      const result = await db.rpc("reorder_content", { p_ids: values.ids });
      if (result.error)
        throw new HttpError(
          409,
          "The collection changed. Refresh and retry the reorder.",
        );
      return { ok: true };
    }
    if (segments[1] === "content") {
      if (segments.length === 2 && method === "POST") {
        const values = contentSchema.parse(await jsonBody(request));
        const current = await db
          .from("content")
          .select("id", { head: true, count: "exact" });
        checked(current);
        if ((current.count ?? 0) >= 500)
          throw new HttpError(
            409,
            "The MVP supports up to 500 content items. Remove an old item first.",
          );
        return checked(
          await db.from("content").insert(values).select().single(),
        );
      }
      const id = uuid.parse(segments[2]);
      if (method === "PUT")
        return checked(
          await db
            .from("content")
            .update(contentSchema.parse(await jsonBody(request)))
            .eq("id", id)
            .select()
            .single(),
        );
      if (method === "DELETE") {
        checked(await db.from("content").delete().eq("id", id));
        return { ok: true };
      }
    }
    if (
      segments[1] === "participants" &&
      segments.length === 3 &&
      method === "PATCH"
    ) {
      const id = uuid.parse(segments[2]);
      const values = z
        .object({ status: z.enum(["approved", "hidden"]) })
        .parse(await jsonBody(request));
      return participantView(
        checked(
          await db
            .from("participants")
            .update(values)
            .eq("id", id)
            .select()
            .single(),
        ),
      );
    }
    if (segments[1] === "photos") {
      if (segments.length === 2 && method === "POST") {
        await limit(user.id + ":upload", 10);
        const count = await db
          .from("admin_photos")
          .select("id", { head: true, count: "exact" });
        checked(count);
        if ((count.count ?? 0) >= 100)
          throw new HttpError(
            409,
            "Remove an editorial photo before adding more.",
          );
        const { path: photo_path, form } = await upload(
          request,
          "admin-photos",
          user.id,
        );
        try {
          const caption = z
            .string()
            .trim()
            .min(1)
            .max(80)
            .parse(form.get("caption"));
          return checked(
            await db
              .from("admin_photos")
              .insert({ caption, photo_path })
              .select("id,caption,enabled,position")
              .single(),
          );
        } catch (error) {
          await removePhoto("admin-photos", photo_path);
          throw error;
        }
      }
      const id = uuid.parse(segments[2]);
      if (method === "PATCH") {
        const values = z
          .object({
            enabled: z.boolean(),
            position: z.number().int().min(0).max(100000),
          })
          .parse(await jsonBody(request));
        return checked(
          await db
            .from("admin_photos")
            .update(values)
            .eq("id", id)
            .select("id")
            .single(),
        );
      }
      if (method === "DELETE") {
        const row = checked(
          await db
            .from("admin_photos")
            .select("photo_path")
            .eq("id", id)
            .single(),
        );
        // Hide first, so a storage deletion failure cannot expose the photo again.
        checked(
          await db.from("admin_photos").update({ enabled: false }).eq("id", id),
        );
        if (!row) throw new HttpError(404, "Photo not found.");
        await removePhoto("admin-photos", row.photo_path);
        checked(await db.from("admin_photos").delete().eq("id", id));
        return { ok: true };
      }
    }
    throw new HttpError(404, "Not found.");
  }
  if (method === "GET" && path === "me") {
    const [person, visits] = await Promise.all([
      db.from("participants").select("*").eq("id", user.id).maybeSingle(),
      db.from("visits").select("content_id").eq("participant_id", user.id),
    ]);
    const row = checked(person);
    return {
      participant: row ? await participantView(row) : null,
      visited: (checked(visits) ?? []).map((v) => v.content_id).filter(Boolean),
    };
  }
  if (method === "POST" && path === "join") {
    if (!user.is_anonymous)
      throw new HttpError(
        403,
        "Please sign out of your administrator account before joining.",
      );
    await limit(user.id + ":join", 5);
    const values = joinSchema.parse(await jsonBody(request));
    const existing = checked(
      await db.from("participants").select("*").eq("id", user.id).maybeSingle(),
    );
    if (existing) return participantView(existing);
    return participantView(
      checked(
        await db
          .from("participants")
          .insert({
            id: user.id,
            alias: values.alias,
            avatar: values.avatar,
            consent_version: CONSENT_VERSION,
          })
          .select()
          .single(),
      ),
    );
  }
  if (method === "POST" && path === "avatar") {
    await limit(user.id + ":upload", 5);
    const row = checked(
      await db
        .from("participants")
        .select("photo_path,status")
        .eq("id", user.id)
        .maybeSingle(),
    );
    if (!row)
      throw new HttpError(409, "Join the mosaic before uploading a photo.");
    if (row.status === "hidden")
      throw new HttpError(403, "Your tile has been hidden by a moderator.");
    const { path: photo_path } = await upload(
      request,
      "participant-photos",
      user.id,
    );
    try {
      let update = db
        .from("participants")
        .update({ photo_path, status: "pending" })
        .eq("id", user.id)
        .neq("status", "hidden");
      update = row.photo_path
        ? update.eq("photo_path", row.photo_path)
        : update.is("photo_path", null);
      checked(await update.select("id").single());
    } catch (error) {
      await removePhoto("participant-photos", photo_path);
      throw error;
    }
    await removePhoto("participant-photos", row.photo_path);
    return { ok: true };
  }
  if (method === "POST" && segments[0] === "visits" && segments.length === 2) {
    const id = uuid.parse(segments[1]);
    await limit(user.id + ":visits", 20);
    const item = checked(
      await db
        .from("content")
        .select("url")
        .eq("id", id)
        .eq("enabled", true)
        .maybeSingle(),
    );
    if (!item)
      throw new HttpError(404, "This discovery is no longer available.");
    const result = await db.rpc("record_visit", {
      p_participant: user.id,
      p_content: id,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Join the mosaic to discover content, or check whether your tile has been moderated.",
      );
    return { url: item.url, discoveries: result.data };
  }
  if (method === "DELETE" && path === "account") {
    if (!user.is_anonymous)
      throw new HttpError(
        403,
        "This action is for anonymous participants only.",
      );
    // First remove public visibility. Retrying is safe if storage or Auth is temporarily unavailable.
    checked(
      await db
        .from("participants")
        .update({ status: "hidden" })
        .eq("id", user.id),
    );
    const list = checked(
      await db.storage
        .from("participant-photos")
        .list(user.id, { limit: 1000 }),
    );
    if (list?.length)
      checked(
        await db.storage
          .from("participant-photos")
          .remove(list.map((item) => user.id + "/" + item.name)),
      );
    const result = await db.auth.admin.deleteUser(user.id);
    if (result.error)
      throw new HttpError(503, "Deletion is not complete yet. Please retry.");
    return { ok: true };
  }
  throw new HttpError(404, "Not found.");
}
async function route(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      throw new HttpError(403, "Cross-site requests are not accepted.");
    const safe = await bounded(request);
    const result = await handle(safe, (await context.params).path);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status =
      error instanceof HttpError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof ZodError
          ? error.issues[0]?.message
          : "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  }
}
export {
  route as GET,
  route as POST,
  route as PUT,
  route as PATCH,
  route as DELETE,
};
