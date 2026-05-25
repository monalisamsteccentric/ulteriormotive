import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ulterior Motive",
  description: "A hidden identity social deduction chat game.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#080912",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
