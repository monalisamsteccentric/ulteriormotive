import { JoinMatchForm } from "@/components/match/JoinMatchForm";
import { AppShell } from "@/components/layout/AppShell";
import { supabaseServer } from "@/lib/supabaseServer";
import { PublicMatch } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
  searchParams
}: {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { inviteCode } = await params;
  const { created } = await searchParams;
  const normalizedInviteCode = inviteCode.toUpperCase();
  const supabase = await supabaseServer();
  const { data: match } = await supabase
    .from("public_matches")
    .select("*")
    .eq("invite_code", normalizedInviteCode)
    .maybeSingle();
  const publicMatch = match as PublicMatch | null;
  const creatorSeat =
    created && publicMatch?.player_a_user_id && !publicMatch.player_b_user_id
      ? "player_a"
      : created && publicMatch?.player_b_user_id && !publicMatch.player_a_user_id
        ? "player_b"
        : null;

  return (
    <AppShell>
      <section className="mb-5 text-center">
        <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">Join Match</h1>
      </section>
      <JoinMatchForm
        inviteCode={normalizedInviteCode}
        match={publicMatch}
        createdMatchId={created ?? null}
        creatorSeat={creatorSeat}
      />
    </AppShell>
  );
}
