import { BetaFeedbackForm } from "@/components/creator/BetaFeedbackForm";
import { AppShell } from "@/components/layout/AppShell";

const matchSteps = [
  "Two players join a match.",
  "Each player secretly selects Human or AI.",
  "The players chat.",
  "The audience watches.",
  "The audience votes.",
  "Players earn points based on how many people they successfully deceive.",
  "Top players qualify for championship matches."
];

export default function HowToPlayPage() {
  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <section className="rounded-lg border border-line bg-ink/90 p-5 shadow-glow sm:p-7">
          <p className="text-sm font-black uppercase text-neon">Game guide</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-5xl">How to Play Ulterior Motive</h1>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-line bg-panel p-5">
            <h2 className="text-2xl font-black text-white">What is Ulterior Motive?</h2>
            <div className="mt-3 space-y-3 text-base font-bold leading-7 text-mist">
              <p>Ulterior Motive is a psychological social deduction game where two players enter a live chat match.</p>
              <p>Each player secretly chooses whether they want to play as Human or AI.</p>
              <p>The audience watches the conversation and tries to determine who is human, who is AI, and who is lying.</p>
            </div>
          </article>

          <article className="rounded-lg border border-line bg-ink p-5">
            <h2 className="text-2xl font-black text-white">How a Match Works</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {matchSteps.map((step, index) => (
                <li key={step} className="rounded-lg border border-line bg-panel p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-sm font-black text-void">{index + 1}</span>
                  <p className="mt-3 text-sm font-black leading-6 text-white">{step}</p>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="rounded-lg border border-shock/50 bg-shock/10 p-5">
          <h2 className="text-2xl font-black text-white">Beta Notice</h2>
          <p className="mt-3 text-base font-bold leading-7 text-mist">
            Ulterior Motive is currently in beta. You may encounter bugs, UI issues, match issues, voting issues, or unexpected behavior.
          </p>
          <p className="mt-2 text-base font-bold leading-7 text-white">Please submit feedback using the form below.</p>
        </section>

        <BetaFeedbackForm />
      </div>
    </AppShell>
  );
}
