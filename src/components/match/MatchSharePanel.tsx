"use client";

import { useEffect, useState } from "react";
import { Camera, Copy, Instagram, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/common/Button";

export function MatchSharePanel({
  matchId,
  playerAUserId,
  playerBUserId,
  playerAName,
  playerBName
}: {
  matchId: string;
  playerAUserId: string | null;
  playerBUserId: string | null;
  playerAName: string;
  playerBName: string;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [shareRole, setShareRole] = useState<"player_a" | "player_b" | "audience">("audience");

  useEffect(() => {
    setUrl(`${window.location.origin}/match/${matchId}?audience=1`);
  }, [matchId]);

  useEffect(() => {
    const userId = localStorage.getItem("hidden_user_id");
    setShareRole(userId === playerAUserId ? "player_a" : userId === playerBUserId ? "player_b" : "audience");
  }, [playerAUserId, playerBUserId]);

  useEffect(() => {
    if (messageTouched) return;
    setMessage(defaultShareMessage(shareRole, playerAName, playerBName));
  }, [messageTouched, playerAName, playerBName, shareRole]);

  const shareText = `${message.trim()}\n\n${url || matchId}`;

  async function copy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
  }

  async function openStoryApp(target: "snapchat" | "instagram") {
    await copy();
    const appUrl = target === "snapchat" ? "snapchat://camera" : "instagram://story-camera";
    const webUrl = target === "snapchat" ? "https://www.snapchat.com/" : "https://www.instagram.com/";
    window.location.href = appUrl;
    window.setTimeout(() => window.open(webUrl, "_blank", "noopener,noreferrer"), 700);
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copy();
      return;
    }
    await navigator.share({ text: message.trim(), url: url || undefined, title: "Ulterior Motive" });
  }

  return (
    <section className="rounded-lg border border-line bg-ink p-4 space-y-3">
      <p className="text-sm font-black uppercase text-mist sm:text-xs">Audience match link</p>
      <p className="mt-2 break-all text-base font-black text-white sm:text-sm">{matchId}</p>
      <label className="block">
        <span className="text-sm font-black uppercase text-mist sm:text-xs">Share message</span>
        <textarea
          value={message}
          maxLength={280}
          onChange={(event) => {
            setMessage(event.target.value);
            setMessageTouched(true);
            setCopied(false);
          }}
          className="mt-2 min-h-32 w-full resize-none rounded-lg border border-line bg-panel px-3 py-3 text-sm font-bold leading-6 text-white outline-none focus:border-neon"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <a
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-black text-white"
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
        <Button type="button" variant="ghost" className="gap-2" onClick={() => openStoryApp("snapchat")}>
          <Camera size={16} /> Snapchat
        </Button>
        <Button type="button" variant="ghost" className="gap-2" onClick={() => openStoryApp("instagram")}>
          <Instagram size={16} /> Instagram
        </Button>
        <Button type="button" variant="ghost" className="gap-2" onClick={nativeShare}>
          <Share2 size={16} /> Share
        </Button>
      </div>
      <Button type="button" variant="ghost" className="w-full gap-2" onClick={copy}>
        <Copy size={16} /> {copied ? "Message copied" : "Copy message"}
      </Button>
    </section>
  );
}

function defaultShareMessage(role: "player_a" | "player_b" | "audience", playerAName: string, playerBName: string) {
  if (role === "player_a") {
    return `Hi I am playing ${playerBName} at Ulterior Motive in 10 minutes. Join the link to play with us and help me win.`;
  }
  if (role === "player_b") {
    return `Hi I am about to play ${playerAName} at Ulterior Motive in 10 minutes. Join the link to play with us and help me win.`;
  }
  return `Hi ${playerAName} and ${playerBName} are playing Ulterior Motive in 10 minutes. Join the link, watch with us, and help pick the winner.`;
}
