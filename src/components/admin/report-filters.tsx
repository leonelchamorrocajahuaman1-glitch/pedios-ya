"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const GROUPS = [
  { value: "day", label: "Diario" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
];

export function ReportFilters({ from, to, group }: { from: string; to: string; group: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const push = (patch: Record<string, string>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) n.set(k, v);
    start(() => router.replace(`${pathname}?${n}`));
  };
  const seg = (active: boolean) => cn("h-9 rounded-full px-4 text-sm font-semibold transition", active ? "bg-fg text-bg" : "text-muted hover:text-fg");
  return (
    <div className={cn("mb-6 flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <div className="flex rounded-full bg-surface-2 p-1">
        {GROUPS.map((g) => <button key={g.value} className={seg(group === g.value)} onClick={() => push({ agrupar: g.value })}>{g.label}</button>)}
      </div>
      <label className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted">
        Desde <input type="date" value={from} max={to} onChange={(e) => e.target.value && push({ desde: e.target.value })} className="bg-transparent text-fg outline-none" />
      </label>
      <label className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted">
        Hasta <input type="date" value={to} min={from} onChange={(e) => e.target.value && push({ hasta: e.target.value })} className="bg-transparent text-fg outline-none" />
      </label>
    </div>
  );
}
