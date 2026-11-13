import { MatchRoom } from '@/components/GameApp';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MatchRoom id={id} key={id} />; }
