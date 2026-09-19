import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ulterior Motive - A little curiosity goes a long way",
  icons: { icon: "/icon.svg" },
  description:
    "Discover something worth your attention. Join a living community mosaic and watch your place grow with every new discovery.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
