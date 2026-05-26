"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({
      scope: "app-error-boundary",
      message: error.message,
      digest: error.digest,
      time: new Date().toISOString()
    }));
  }, [error]);

  return (
    <main className="min-h-dvh bg-gradient-to-br from-void via-plum to-coral px-4 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Something broke</p>
        <h1 className="mt-2 text-3xl font-black">The match view could not load.</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-mist">
          {error.message || "Refresh the page. If it keeps happening, check the production logs for this request."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-12 rounded-lg bg-neon px-4 text-sm font-black text-void"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
