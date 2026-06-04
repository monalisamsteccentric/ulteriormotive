import { SupportButton } from "@/components/creator/SupportButton";
import { AppShell } from "@/components/layout/AppShell";

const supportReasons = ["Server costs", "Development time", "Future features", "Championship prizes", "Beta testing"];

export default function SupportPage() {
  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <section className="rounded-lg border border-line bg-ink/90 p-5 shadow-glow sm:p-7">
          <p className="text-sm font-black uppercase text-neon">Support</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-5xl">Support the Project</h1>
          <p className="mt-4 text-base font-bold leading-7 text-mist sm:text-lg sm:leading-8">
            Ulterior Motive is an independent game and storytelling experiment. Support helps keep the system running and gives the project
            room to grow.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-2xl font-black text-white">Why support helps</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {supportReasons.map((reason) => (
              <li key={reason} className="rounded-lg border border-line bg-ink p-4 text-base font-black text-white">
                {reason}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-ink p-5">
          <SupportButton className="w-full sm:w-auto" />
        </section>
      </div>
    </AppShell>
  );
}
