import { AutomationShell } from '@/components/AutomationShell';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Enterprise Operations Automation', description: 'An integrated operations system connecting your applications, workflows, AI and data. Indicative implementation engagements from ₹15 lakh, subject to discovery.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <AutomationShell>{children}</AutomationShell>; }
