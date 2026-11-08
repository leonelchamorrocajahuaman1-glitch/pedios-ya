import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint, icon, className }: { label: string; value: string; hint?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-border bg-surface p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted [&_svg]:h-4.5 [&_svg]:w-4.5">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
