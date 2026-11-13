"use client";
import Link from 'next/link';
import { useSyncExternalStore, type ComponentProps } from 'react';
import { productPath } from '@/lib/routing';
const subscribe = () => () => {};
export default function ProductLink(props: ComponentProps<typeof Link>) {
  const host = useSyncExternalStore(subscribe, () => window.location.hostname, () => '');
  return <Link {...props} href={typeof props.href === 'string' ? productPath(props.href, host) : props.href} />;
}
