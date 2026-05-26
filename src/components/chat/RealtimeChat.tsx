"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatBubble } from "./ChatBubble";
import { supabaseClient } from "@/lib/supabaseClient";
import { validateMessage } from "@/lib/utils";
import { Message, PlayerRole, PublicMatch, SenderRole } from "@/types/database";

function roleLabel(role: SenderRole) {
  if (role === "player_a") return "Player A";
  if (role === "player_b") return "Player B";
  if (role === "audience") return "Audience";
  return "System";
}

export function RealtimeChat({
  matchId,
  initialMessages,
  userId,
  playerAUserId,
  playerBUserId,
  status,
  playerAIsAi,
  playerBIsAi
}: {
  matchId: string;
  initialMessages: Message[];
  userId: string | null;
  playerAUserId: string | null;
  playerBUserId: string | null;
  status: string;
  playerAIsAi: boolean;
  playerBIsAi: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [entryError, setEntryError] = useState("");
  const [clientUserId, setClientUserId] = useState(userId);
  const [role, setRole] = useState<SenderRole>("audience");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  function mergeMessages(nextMessages: Message[]) {
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of nextMessages) byId.set(message.id, message);
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }

  async function syncMessages() {
    const response = await fetch(`/api/matches/${matchId}/messages`);
    if (!response.ok) return;
    mergeMessages((await response.json()) as Message[]);
  }

  async function syncMatch() {
    const response = await fetch(`/api/matches/${matchId}`, { cache: "no-store" });
    if (!response.ok) return;
    const match = (await response.json()) as PublicMatch;
    if (match.status === "revealed" || match.status === "completed") {
      router.push(`/match/${matchId}/reveal`);
      return;
    }
    if (match.status !== status) router.refresh();
  }

  async function markEntered(userIdToMark: string) {
    const response = await fetch(`/api/matches/${matchId}/enter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: userIdToMark })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setEntryError(result?.error ?? "Could not mark you as entered.");
      return;
    }
    setEntryError("");
    const match = await response.json();
    if (match?.status && match.status !== status) router.refresh();
  }

  useEffect(() => {
    let id = clientUserId;
    if (!id) {
      id = localStorage.getItem("hidden_user_id") ?? crypto.randomUUID();
      localStorage.setItem("hidden_user_id", id);
      setClientUserId(id);
    }
    const nextRole: PlayerRole | "audience" =
      id === playerAUserId ? "player_a" : id === playerBUserId ? "player_b" : "audience";
    setRole(nextRole);
    if (nextRole === "player_a" || nextRole === "player_b") {
      markEntered(id);
    }

    const supabase = supabaseClient();
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on("broadcast", { event: "message" }, (payload) => {
        mergeMessages([payload.payload as Message]);
        syncMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, clientUserId, playerAUserId, playerBUserId, router]);

  useEffect(() => {
    const supabase = supabaseClient();
    const channel = supabase
      .channel(`matches:${matchId}`)
      .on("broadcast", { event: "updated" }, () => {
        syncMatch();
        syncMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, status, router]);

  useEffect(() => {
    syncMessages();
    syncMatch();
    const id = window.setInterval(() => {
      syncMessages();
      syncMatch();
    }, 4000);
    return () => window.clearInterval(id);
  }, [matchId, status, router]);

  useEffect(() => {
    if (status !== "waiting") return;
    const intervalId = window.setInterval(() => {
      if (clientUserId && (role === "player_a" || role === "player_b")) {
        markEntered(clientUserId);
      }
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [clientUserId, router, role, status]);

  useEffect(() => {
    if (status !== "live") return;
    const id = window.setInterval(() => {
      fetch(`/api/matches/${matchId}/ai-tick`, { method: "POST" });
    }, 9000);
    return () => window.clearInterval(id);
  }, [matchId, status]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 160) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateMessage(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const submittedMessage = result.message;
    setDraft("");
    setError("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId, senderRole: role, senderUserId: clientUserId, message: submittedMessage })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error ?? "Message failed. Try again.");
      setDraft(submittedMessage);
    } else {
      syncMessages();
    }
  }

  return (
    <section className="flex min-h-[56dvh] flex-1 flex-col overflow-hidden rounded-lg border border-line bg-ink">
      <div className="border-b border-line bg-panel px-4 py-4 sm:px-3 sm:py-3">
        <p className="text-sm font-black uppercase text-mist sm:text-xs">You are {roleLabel(role)}</p>
        <p className="mt-1 text-lg font-bold leading-8 text-white sm:text-sm sm:leading-normal">
          {role === "audience"
            ? playerAIsAi && playerBIsAi
              ? "Both seats are AI-controlled. Watch the bots talk, vote, and reveal when ready."
              : "Watch the chat, vote on who is AI, and wait for the reveal."
            : status === "waiting"
              ? "Wait for the other seat to fill. You can chat once the match is live."
              : `Send messages as ${roleLabel(role)}. Do not reveal whether you chose human or AI.`}
        </p>
        {entryError ? <p className="mt-2 text-sm font-black text-shock sm:text-xs">{entryError}</p> : null}
      </div>
      <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-3 sm:p-3">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
      {role === "audience" ? (
        <div className="border-t border-line bg-void/95 p-4 text-lg font-bold leading-8 text-mist sm:p-3 sm:text-sm sm:leading-normal">
          Audience mode: watch the players and vote from the suspicion panel.
        </div>
      ) : (
        <form onSubmit={send} className="sticky bottom-0 flex gap-2 border-t border-line bg-void/95 p-4 sm:p-3">
          <input
            value={draft}
            maxLength={280}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message as ${roleLabel(role)}...`}
            disabled={status === "waiting"}
            className="min-h-14 min-w-0 flex-1 rounded-lg border border-line bg-panel px-4 text-base text-white outline-none focus:border-neon sm:min-h-12 sm:px-3 sm:text-sm"
          />
          <button aria-label="Send" disabled={status === "waiting"} className="grid min-h-14 w-14 place-items-center rounded-lg bg-neon text-void disabled:opacity-40 sm:min-h-12 sm:w-12">
            <Send size={18} />
          </button>
        </form>
      )}
      {error ? <p className="px-3 pb-3 text-sm font-bold text-shock">{error}</p> : null}
    </section>
  );
}
