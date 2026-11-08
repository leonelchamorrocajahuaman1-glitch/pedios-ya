import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function Section({ title, subtitle, icon, href, linkLabel = "Ver todo", children, id }: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {icon && <span className="text-brand [&_svg]:h-6 [&_svg]:w-6">{icon}</span>} {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {linkLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
