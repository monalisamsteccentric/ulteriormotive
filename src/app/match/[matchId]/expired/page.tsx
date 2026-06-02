import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function MatchExpiredPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await supabaseServer();
  const { data: match } = await supabase.from("public_matches").select("*").eq("id", matchId).maybeSingle();
  const inviteCode = match?.invite_code ?? "UNKNOWN";

  return (
    <AppShell>
      <section className="rounded-lg border border-shock bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Time expired</p>
        <h1 className="mt-1 text-4xl font-black text-white">No one joined this match in time.</h1>
        <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-mist">
          Invite {inviteCode} waited until its timer elapsed, but the open seat was not claimed.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/create" className="inline-flex min-h-12 items-center rounded-lg bg-neon px-4 text-sm font-black text-void">
            Create a new match
          </Link>
          <Link href="/join" className="inline-flex min-h-12 items-center rounded-lg border border-line bg-panel px-4 text-sm font-black text-white">
            Join another match
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
