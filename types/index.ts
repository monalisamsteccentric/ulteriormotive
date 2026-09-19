export type Participant = {
  id: string;
  alias: string;
  avatar: string;
  photo_url: string | null;
  status: "pending" | "approved" | "hidden";
  discoveries: number;
  created_at: string;
};
export type ContentItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: "Read" | "Watch" | "Listen" | "Explore";
  duration_minutes: number;
  position: number;
  enabled: boolean;
};
export type MosaicTile = {
  id: string;
  alias: string;
  avatar: string;
  photo_url: string | null;
  discoveries: number;
  editorial?: boolean;
};
export type AdminPhoto = {
  id: string;
  caption: string;
  enabled: boolean;
  position: number;
  photo_url: string | null;
};
export type Analytics = {
  participants: number;
  discoveries: number;
  pending: number;
  activeContent: number;
  daily: { day: string; discoveries: number }[];
  content: { id: string; title: string; visits: number }[];
};
