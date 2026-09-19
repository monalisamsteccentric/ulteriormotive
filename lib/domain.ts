import { z } from "zod";
export const CONSENT_VERSION = "2026-09-19";
export const LEVELS = [
  { name: "New spark", min: 0, size: 1 },
  { name: "Curious mind", min: 1, size: 1 },
  { name: "Explorer", min: 3, size: 2 },
  { name: "Trailblazer", min: 6, size: 2 },
  { name: "Luminary", min: 10, size: 3 },
] as const;
export function progress(count: number) {
  const level = [...LEVELS].reverse().find((l) => count >= l.min) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.min > count);
  return {
    ...level,
    next: next ?? null,
    percent: next
      ? Math.min(
          100,
          Math.round(((count - level.min) / (next.min - level.min)) * 100),
        )
      : 100,
  };
}
export function safeExternalUrl(input: string) {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.includes(":") ||
      /^\d+(\.\d+){3}$/.test(host) ||
      !host.includes(".")
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
export const contentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600),
  url: z
    .string()
    .max(2048)
    .refine(safeExternalUrl, "Use a public HTTPS URL without credentials."),
  category: z.enum(["Read", "Watch", "Listen", "Explore"]),
  duration_minutes: z.number().int().min(1).max(240),
  position: z.number().int().min(0).max(100000),
  enabled: z.boolean(),
});
export const joinSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(
      /^[\p{L}\p{N} _.-]+$/u,
      "Use letters, numbers, spaces, dots, dashes or underscores.",
    ),
  avatar: z.enum(["violet", "coral", "mint", "gold"]),
  consent: z.literal(true),
});
export const uuid = z.string().uuid();
