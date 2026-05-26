import { Bot, Eye, LogIn, Plus } from "lucide-react";
import { LinkButton } from "@/components/common/Button";
import { AppShell } from "@/components/layout/AppShell";
import { HeroPhone } from "@/components/match/HeroPhone";

export default function HomePage() {
  return (
    <AppShell>
      <section className="mx-auto mb-8 max-w-3xl text-center">
        <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white sm:text-xs sm:tracking-[0.18em]">
          Ulterior Motive
        </div>
        <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-normal text-white sm:text-7xl sm:leading-[0.9] lg:text-8xl">
          Nobody knows who is human.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/80 sm:text-lg">
          Player A and Player B stay visible. The human or AI truth stays buried until the reveal.
        </p>
      </section>
      <section className="mb-8 grid items-center gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="hidden lg:block">
          <HeroPhone
            image="/reference/hidden-ref-1.png"
            title="Player A looks human."
            subtitle="The label is public. The controller is not."
          />
        </div>
        <HeroPhone
          image="/reference/hidden-ref-2.png"
          title="Guess the ghost in the chat."
          subtitle="Vote with the audience, read the hesitations, then watch the reveal hit."
          align="center"
          featured
        />
        <div className="hidden lg:block">
          <HeroPhone
            image="/reference/hidden-ref-3.png"
            title="Player B might be lying."
            subtitle="Human, AI, both, or neither. Nobody knows until the game unlocks."
            align="right"
          />
        </div>
      </section>
      <nav className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        <HomeAction href="/create" icon={<Plus />} label="Create Match" />
        <HomeAction href="/join" icon={<Bot />} label="Join Match" />
        <HomeAction href="/matches" icon={<Eye />} label="Watch Live Matches" />
        <HomeAction href="/login" icon={<LogIn />} label="Login / Sign up" />
      </nav>
    </AppShell>
  );
}

function HomeAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <LinkButton href={href} variant="ghost" className="justify-start gap-3 text-lg sm:text-base">
      <span className="text-neon">{icon}</span>
      {label}
    </LinkButton>
  );
}
