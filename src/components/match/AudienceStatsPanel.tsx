"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Radio } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

type AudienceStatsResponse = {
  joinedCount?: number;
};

export function AudienceStatsPanel({ matchId }: { matchId: string }) {
  const searchParams = useSearchParams();
  const isAudience = searchParams.get("audience") === "1";
  const [joinedCount, setJoinedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const viewerId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const storageKey = isAudience ? "hidden_audience_user_id" : "hidden_user_id";
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(storageKey, next);
    return next;
  }, [isAudience]);

  const syncJoinedCount = useCallback(async () => {
    const response = await fetch(`/api/matches/${matchId}/audience`, { cache: "no-store" });
    if (!response.ok) return;
    const result = (await response.json()) as AudienceStatsResponse;
    setJoinedCount(Number(result.joinedCount ?? 0));
  }, [matchId]);

  useEffect(() => {
    syncJoinedCount();
    const id = window.setInterval(syncJoinedCount, 10000);
    return () => window.clearInterval(id);
  }, [syncJoinedCount]);

  useEffect(() => {
    if (!isAudience || !viewerId) return;

    async function registerAudienceViewer() {
      const response = await fetch(`/api/matches/${matchId}/audience`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewerUserId: viewerId })
      });
      if (!response.ok) return;
      const result = (await response.json()) as AudienceStatsResponse;
      setJoinedCount(Number(result.joinedCount ?? 0));
    }

    registerAudienceViewer();
    const id = window.setInterval(registerAudienceViewer, 30000);
    return () => window.clearInterval(id);
  }, [isAudience, matchId, viewerId]);

  useEffect(() => {
    const supabase = supabaseClient();
    const channel = supabase.channel(`audience:${matchId}`, {
      config: { presence: { key: isAudience && viewerId ? viewerId : `observer:${viewerId || crypto.randomUUID()}` } }
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeAudience = Object.keys(state).filter((key) => !key.startsWith("observer:")).length;
        setActiveCount(activeAudience);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && isAudience && viewerId) {
          channel.track({ viewerId, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      if (isAudience) channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [isAudience, matchId, viewerId]);

  return (
    <section className="rounded-lg border border-line bg-ink p-4">
      <p className="text-sm font-black uppercase text-neon sm:text-xs">Audience activity</p>
      <p className="mt-1 text-sm font-bold leading-6 text-mist">Suspicion moves as people watch, vote, and wait for the reveal.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <AudienceCount icon="joined" label="Audience Joined" value={joinedCount} />
        <AudienceCount icon="active" label="Watching Now" value={activeCount} />
      </div>
    </section>
  );
}

function AudienceCount({ icon, label, value }: { icon: "joined" | "active"; label: string; value: number }) {
  const Icon = icon === "active" ? Radio : Eye;
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="flex items-center gap-2 text-sm font-black uppercase text-mist sm:text-xs">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black text-white sm:text-2xl">{value}</p>
    </div>
  );
}
