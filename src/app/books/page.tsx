import { ReaderInterestForm } from "@/components/creator/ReaderInterestForm";
import { AppShell } from "@/components/layout/AppShell";

export default function BooksPage() {
  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <section className="rounded-lg border border-line bg-ink/90 p-5 shadow-glow sm:p-7">
          <p className="text-sm font-black uppercase text-neon">Reader list</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-5xl">
            Would you like to read my next psychological mystery?
          </h1>
          <p className="mt-4 text-base font-bold leading-7 text-mist sm:text-lg sm:leading-8">
            I'm building stories and experiences that explore secrets, obsession, mystery, love, memory, human nature, and hidden truths.
          </p>
          <p className="mt-3 text-base font-bold leading-7 text-white sm:text-lg sm:leading-8">
            If you'd like to be among the first readers of my upcoming books, join the reader list below.
          </p>
        </section>

        <ReaderInterestForm />
      </div>
    </AppShell>
  );
}
