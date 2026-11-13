import { AutomationShell } from '@/components/AutomationShell';
import type { Metadata } from 'next';
export const metadata: Metadata = { alternates: { canonical: 'https://automation.ulteriormotive.club/' }, metadataBase: new URL('https://automation.ulteriormotive.club'), icons: { icon: [{ url: '/icons/automation.svg?v=1', type: 'image/svg+xml' }] }, title: 'Enterprise Operations Automation', description: 'An integrated operations system connecting your applications, workflows, AI and data. Enterprise implementation shaped around your business.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <AutomationShell>{children}</AutomationShell>; }
