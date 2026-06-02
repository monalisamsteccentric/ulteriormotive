import { AppShell } from "@/components/layout/AppShell";
import { JoinByCodeForm } from "@/components/match/JoinByCodeForm";

export default function JoinPage() {
  return (
    <AppShell>
      <section className="mx-auto w-full max-w-3xl py-4 sm:py-8">
        <p className="text-sm font-black uppercase text-neon">Enter the arena</p>
        <h1 className="mt-2 text-5xl font-black leading-none text-white sm:text-7xl">Join Match</h1>
        <p className="mt-4 text-lg font-bold leading-8 text-mist">
          Claim a seat, hide your role, and make everyone question what they are seeing.
        </p>
        <div className="mt-7">
          <JoinByCodeForm />
        </div>
      </section>
    </AppShell>
  );
}
