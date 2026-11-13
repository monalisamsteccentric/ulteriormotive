export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { return { title: 'Live conversation', robots: { index: false, follow: false }, alternates: { canonical: `https://game.ulteriormotive.club/matches/${encodeURIComponent((await params).id)}` } }; }
import { MatchRoom } from '@/components/GameApp';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MatchRoom id={id} key={id} />; }
