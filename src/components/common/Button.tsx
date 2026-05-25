import Link from "next/link";
import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const styles =
  "inline-flex min-h-12 items-center justify-center rounded-lg border px-4 text-sm font-black transition active:scale-[0.98]";
const variants = {
  primary: "border-shock bg-shock text-white shadow-glow",
  ghost: "border-line bg-white/15 text-white backdrop-blur-xl hover:border-white/45",
  danger: "border-shock bg-shock text-white"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cn(styles, variants[variant], className)} {...props} />;
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: keyof typeof variants;
};

export function LinkButton({ className, variant = "primary", href, ...props }: LinkButtonProps) {
  return <Link href={href} className={cn(styles, variants[variant], className)} {...props} />;
}
