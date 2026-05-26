"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function JoinError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({
      scope: "join-error-boundary",
      message: error.message,
      digest: error.digest,
      time: new Date().toISOString()
    }));
  }, [error]);

  return (
    <main className="min-h-dvh bg-gradient-to-br from-void via-plum to-coral px-4 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-lg border border-line bg-ink p-5">
        <p className="text-sm font-black uppercase text-mist">Join failed</p>
        <h1 className="mt-2 text-3xl font-black">The invite route loaded, but the match lookup failed.</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-mist">{error.message || "Check the invite code and try again."}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="min-h-12 rounded-lg bg-neon px-4 text-sm font-black text-void">
            Try again
          </button>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-lg border border-line bg-panel px-4 text-sm font-black">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
