import { LinkButton } from "@/components/common/Button";

export function SupportButton({ className }: { className?: string }) {
  const supportUrl = process.env.VITE_RAZORPAY_SUPPORT_URL || process.env.NEXT_PUBLIC_RAZORPAY_SUPPORT_URL;

  if (!supportUrl) {
    return <p className="rounded-lg border border-line bg-panel p-4 text-base font-bold text-mist">Support link coming soon.</p>;
  }

  return (
    <LinkButton href={supportUrl} target="_blank" rel="noopener noreferrer" className={className}>
      Support via Razorpay
    </LinkButton>
  );
}
