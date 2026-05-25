import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const blockedWords = ["profanity-placeholder"];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createInviteCode() {
  return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase();
}

export function inviteUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yourdomain.com";
  return `${base}/join/${code}`;
}

export function cleanMessage(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function validateMessage(input: string) {
  const message = cleanMessage(input);
  if (!message) return { ok: false as const, error: "Message cannot be empty." };
  if (message.length > 280) return { ok: false as const, error: "Keep messages under 280 characters." };
  if (blockedWords.some((word) => message.toLowerCase().includes(word))) {
    return { ok: false as const, error: "Message blocked by moderation." };
  }
  return { ok: true as const, message };
}

export function canReveal(status: string) {
  return status === "revealed" || status === "completed";
}
