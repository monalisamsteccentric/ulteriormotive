"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="legal shell">
      <h1>A small interruption.</h1>
      <p>We couldn&apos;t load this page. Please try again.</p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
