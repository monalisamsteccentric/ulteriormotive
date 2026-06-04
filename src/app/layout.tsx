import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Orbitron, Oxanium, Space_Grotesk, Syncopate } from "next/font/google";
import { BetaNoticeModal } from "@/components/layout/BetaNoticeModal";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-logo"
});

const syncopate = Syncopate({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-logo-alt"
});

const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-number"
});

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
      <body className={`${chakraPetch.variable} ${syncopate.variable} ${oxanium.variable} ${spaceGrotesk.variable} ${orbitron.variable}`}>
        <BetaNoticeModal />
        {children}
      </body>
    </html>
  );
}
