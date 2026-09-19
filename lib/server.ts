import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new HttpError(
      503,
      "The experience is being set up. Please check back soon.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function identity(request: Request, admin = false) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 8192)
    throw new HttpError(401, "Please sign in to continue.");
  const db = database();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  if (admin) {
    const role = await db
      .from("admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (role.error) throw new HttpError(503, "Unable to check access.");
    if (!role.data || data.user.is_anonymous)
      throw new HttpError(403, "Administrator access required.");
  }
  return { db, user: data.user };
}
export async function limit(key: string, count: number, seconds = 60) {
  const digest = createHash("sha256").update(key).digest("hex");
  const { data, error } = await database().rpc("consume_rate_limit", {
    p_key: digest,
    p_limit: count,
    p_window: seconds,
  });
  if (error) throw new HttpError(503, "Please try again shortly.");
  if (!data)
    throw new HttpError(
      429,
      "Too many requests. Please wait a minute and try again.",
    );
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON required.");
  const text = await request.text();
  if (Buffer.byteLength(text) > 16384)
    throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function checked<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) {
    console.error("Database operation failed");
    throw new HttpError(
      503,
      "We could not save that change. Please try again.",
    );
  }
  return result.data;
}
export async function signPhoto(bucket: string, path: string | null) {
  if (!path) return null;
  const { data, error } = await database()
    .storage.from(bucket)
    .createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
}
