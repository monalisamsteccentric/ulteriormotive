"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";

export function MatchSharePanel({ matchId }: { matchId: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/match/${matchId}`);
  }, [matchId]);

  async function copy() {
    await navigator.clipboard.writeText(url || matchId);
    setCopied(true);
  }

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <p className="text-xs font-black uppercase text-mist">Audience match link</p>
      <p className="mt-2 break-all text-sm font-black text-white">{matchId}</p>
      <Button type="button" variant="ghost" className="mt-3 w-full" onClick={copy}>
        {copied ? "Copied" : "Copy audience link"}
      </Button>
    </section>
  );
}
