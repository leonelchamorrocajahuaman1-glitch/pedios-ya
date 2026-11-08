import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Isotipo original de MULTIPRODUCTOS HUAYTALLA: una canasta que forma la «H»
 * con un asa naranja (cercanía y promociones) sobre fondo verde (frescura).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} aria-hidden>
      <defs>
        <linearGradient id="hy-g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#hy-g)" />
      <path d="M14 17c0-6 4.5-9.5 10-9.5S34 11 34 17" fill="none" stroke="#f97316" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M10.5 18.5h27l-2.6 17.2a3.4 3.4 0 0 1-3.4 2.9H16.5a3.4 3.4 0 0 1-3.4-2.9z" fill="#fff" />
      <path d="M19 23v10.5M29 23v10.5M19 28.2h10" fill="none" stroke="#15803d" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

/** Logotipo horizontal (isotipo + nombre comercial en dos líneas). */
export function Logo({ className, href = "/", compact = false }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="MULTIPRODUCTOS HUAYTALLA — inicio">
      <LogoMark className="shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className={cn("leading-none", compact && "hidden sm:block")}>
        <span className="block text-[9px] font-bold uppercase tracking-[0.32em] text-accent sm:text-[10px]">Multiproductos</span>
        <span className="block font-display text-lg font-bold tracking-tight sm:text-xl">HUAYTALLA</span>
      </span>
    </Link>
  );
}
