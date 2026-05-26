import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { callMatchEdgeFunction } from "@/lib/edgeProxy";

export async function POST(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requireAdmin();
  await callMatchEdgeFunction("admin-inject-ai", { matchId });
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
