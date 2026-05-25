import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { injectAiIntoOpenSeat } from "@/lib/matchService";

export async function POST(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requireAdmin();
  await injectAiIntoOpenSeat(matchId);
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
