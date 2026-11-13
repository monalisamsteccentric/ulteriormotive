import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Ulterior Motive — Systems & Signals', template: '%s · Ulterior Motive' }, description: 'Independent thinking. Connected systems. Explore the conversation game and enterprise operations automation.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
