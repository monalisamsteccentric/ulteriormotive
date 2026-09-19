import Link from "next/link";
export default function NotFound() {
  return (
    <main className="legal shell">
      <h1>A little off the map.</h1>
      <p>This page doesn&apos;t exist.</p>
      <Link className="button dark" href="/">
        Back to the mosaic
      </Link>
    </main>
  );
}
