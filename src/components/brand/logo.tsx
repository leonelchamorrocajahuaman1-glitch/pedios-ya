import Link from "next/link";
import { cn } from "@/lib/utils";

/** Isotipo original de Mikuy: una ruta que dibuja una "M" y termina en un punto de entrega. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id="mk-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#mk-g)" />
      <path
        d="M10 28V14.5a1.5 1.5 0 0 1 2.6-1l6.3 7a1.5 1.5 0 0 0 2.2 0l6.3-7a1.5 1.5 0 0 1 2.6 1V22"
        fill="none"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="28.5" r="3.2" fill="var(--lime)" />
    </svg>
  );
}

export function Logo({ className, name = "Mikuy", href = "/" }: { className?: string; name?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${name} — inicio`}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="font-display text-xl font-bold tracking-tight">{name}</span>
    </Link>
  );
}
