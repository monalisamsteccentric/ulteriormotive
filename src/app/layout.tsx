import type { Metadata } from 'next';
import './globals.css';
import { canonical } from '@/lib/metadata';
const baseMetadata: Metadata = { title: { default: 'Ulterior Motive — Systems & Signals', template: '%s · Ulterior Motive' }, description: 'Independent thinking. Connected systems. Explore the conversation game and enterprise operations automation.' };
export async function generateMetadata(): Promise<Metadata> { return { ...baseMetadata, metadataBase: new URL('https://ulteriormotive.club'), alternates: { canonical: await canonical() } }; }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
