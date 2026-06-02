import { CreateMatchForm } from "@/components/match/CreateMatchForm";
import { AppShell } from "@/components/layout/AppShell";

export default function CreatePage() {
  return (
    <AppShell>
      <section className="mx-auto w-full max-w-4xl py-4 sm:py-8">
        <div className="mb-7">
          <p className="text-sm font-black uppercase text-neon">Start the mind game</p>
          <h1 className="mt-2 text-5xl font-black leading-none text-white sm:text-7xl">Create Match</h1>
          <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-mist">
            Set up a match and challenge someone to uncover the truth.
          </p>
        </div>
        <CreateMatchForm />
      </section>
    </AppShell>
  );
}
