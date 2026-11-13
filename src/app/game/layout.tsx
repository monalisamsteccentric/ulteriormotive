import { GameShell } from '@/components/GameApp';
import type { Metadata } from 'next';
export const metadata: Metadata = { alternates: { canonical: 'https://game.ulteriormotive.club/' }, metadataBase: new URL('https://game.ulteriormotive.club'), title: 'Ulterior Motive — The Conversation Game', description: 'Two voices. One hidden identity. Observe, question and make your call in a live audience conversation game.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <GameShell>{children}</GameShell>; }
