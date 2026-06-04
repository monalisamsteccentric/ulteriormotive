import { SupportButton } from "@/components/creator/SupportButton";
import { AppShell } from "@/components/layout/AppShell";
import { LinkButton } from "@/components/common/Button";

export default function AboutBuilderPage() {
  const instagramUrl = process.env.VITE_INSTAGRAM_URL || process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const linkedInUrl = process.env.VITE_LINKEDIN_URL || process.env.NEXT_PUBLIC_LINKEDIN_URL;

  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <section className="rounded-lg border border-line bg-ink/90 p-5 shadow-glow sm:p-7">
          <p className="text-sm font-black uppercase text-neon">Creator</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-5xl">About the Builder</h1>
          <div className="mt-4 space-y-4 text-base font-bold leading-7 text-mist sm:text-lg sm:leading-8">
            <p>
              Monalisa Sahoo is a software developer, storyteller, author, and creator fascinated by psychology, mystery, secrets,
              deception, and human nature.
            </p>
            <p>She created Ulterior Motive to explore a simple question:</p>
            <p className="rounded-lg border border-neon/40 bg-neon/10 p-4 text-white">Can we really tell who someone is just by talking to them?</p>
            <p>
              In addition to Ulterior Motive, she is also building novels, stories, and psychological mystery experiences designed to make
              people question what they believe about others.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-2xl font-black text-white">Follow the Journey</h2>
          <p className="mt-3 text-base font-bold leading-7 text-mist">
            If you enjoy psychological mysteries, storytelling, human behavior, and projects like Ulterior Motive, follow along for future
            stories, games, experiments, and releases.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {instagramUrl ? (
              <LinkButton href={instagramUrl} target="_blank" rel="noopener noreferrer" variant="ghost" className="w-full sm:w-auto">
                Follow on Instagram
              </LinkButton>
            ) : null}
            {linkedInUrl ? (
              <LinkButton href={linkedInUrl} target="_blank" rel="noopener noreferrer" variant="ghost" className="w-full sm:w-auto">
                Follow on LinkedIn
              </LinkButton>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-ink p-5">
          <h2 className="text-2xl font-black text-white">Support the Project</h2>
          <p className="mt-3 text-base font-bold leading-7 text-mist">
            Ulterior Motive is currently being built independently. If you enjoy the game and would like to support future development,
            testing, infrastructure, and championship prizes, you can support the project below.
          </p>
          <div className="mt-4">
            <SupportButton />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
