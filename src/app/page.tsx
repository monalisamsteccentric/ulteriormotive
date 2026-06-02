import Image from "next/image";
import { Eye, LogIn, Play, Plus, Swords, Users, Vote } from "lucide-react";
import { LinkButton } from "@/components/common/Button";
import { AppShell } from "@/components/layout/AppShell";

const deductionCards = [
  {
    title: "Player A says they are human.",
    body: "But the audience is not convinced."
  },
  {
    title: "One hidden truth.",
    body: "Human, AI, both, or neither. Nobody knows until the reveal."
  },
  {
    title: "Can you spot the lie?",
    body: "Read the chat. Watch the hesitation. Vote before the truth comes out."
  }
];

const steps = [
  "Two players enter a match.",
  "Each player secretly chooses their role.",
  "The audience watches the conversation and votes.",
  "The reveal decides who fooled whom."
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black uppercase text-white sm:text-xs">
          <Swords size={16} className="text-neon" />
          Ulterior Motive
        </div>
        <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.98] tracking-normal text-white sm:text-7xl sm:leading-[0.9] lg:text-8xl">
          Nobody knows who is human.
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/84 sm:text-xl">
          Watch live conversations. Detect lies. Expose hidden AI. Or fool everyone.
        </p>

        <div className="mt-7 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
          <LinkButton href="/matches" className="gap-3 text-lg sm:min-w-56">
            <Eye size={21} />
            Watch Live Match
          </LinkButton>
          <LinkButton href="/join" variant="ghost" className="gap-3 text-lg sm:min-w-52">
            <Play size={21} className="text-neon" />
            Join Next Match
          </LinkButton>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-black uppercase text-mist sm:text-xs">
          <span className="rounded-lg border border-line bg-white/10 px-3 py-2">Live matches</span>
          <span className="rounded-lg border border-line bg-white/10 px-3 py-2">Audience voting</span>
          <span className="rounded-lg border border-line bg-white/10 px-3 py-2">Monthly championship</span>
        </div>

        <nav className="mt-4 flex flex-wrap justify-center gap-2">
          <SmallAction href="/create" icon={<Plus size={16} />} label="Create Match" />
          <SmallAction href="/login" icon={<LogIn size={16} />} label="Login / Sign up" />
        </nav>
      </section>

      <section className="mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-lg border border-line bg-ink shadow-glow">
        <div className="relative aspect-[16/9] min-h-[250px] sm:min-h-[360px]">
          <Image
            src="/hero.png"
            alt="Two hidden players face off while the audience votes on who is human, AI, lying, or trustworthy."
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1120px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/20 bg-void/76 px-4 py-3 backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-5">
            <div className="text-left">
              <p className="text-xs font-black uppercase text-neon">Reveal pending</p>
              <p className="mt-1 text-sm font-bold text-white sm:text-base">Every message is evidence.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black uppercase text-mist">
              <Vote size={16} className="text-shock" />
              Vote before truth drops
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid w-full max-w-6xl gap-3 md:grid-cols-3">
        {deductionCards.map((card, index) => (
          <DeductionCard key={card.title} number={index + 1} title={card.title} body={card.body} />
        ))}
      </section>

      <section className="mx-auto mt-8 w-full max-w-6xl rounded-lg border border-line bg-ink/86 p-5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-mist">How it works</p>
            <h2 className="mt-1 text-3xl font-black leading-tight text-white sm:text-4xl">Lie, read, vote, reveal.</h2>
          </div>
          <p className="max-w-md text-sm font-bold leading-6 text-mist sm:text-right">
            A fast social deduction loop built around live chat, hidden roles, and public suspicion.
          </p>
        </div>
        <ol className="mt-5 grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step} className="rounded-lg border border-line bg-panel p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-shock text-base font-black text-white">
                {index + 1}
              </div>
              <p className="mt-4 text-base font-black leading-6 text-white">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}

function DeductionCard({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-line bg-white/12 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-sm font-black text-void">{number}</span>
        <Users size={18} className="text-shock" />
      </div>
      <h2 className="text-xl font-black leading-7 text-white">{title}</h2>
      <p className="mt-2 text-base font-bold leading-7 text-mist">{body}</p>
    </article>
  );
}

function SmallAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <LinkButton href={href} variant="ghost" className="min-h-10 gap-2 px-3 text-sm opacity-85 shadow-none sm:min-h-10">
      <span className="text-neon">{icon}</span>
      {label}
    </LinkButton>
  );
}
