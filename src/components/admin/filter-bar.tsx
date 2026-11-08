"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Barra de filtros en una sola fila: búsqueda + selects, sincronizada con la URL. */
export function FilterBar({
  searchPlaceholder = "Buscar…",
  selects = [],
  dates = false,
  hideSearch = false,
}: {
  searchPlaceholder?: string;
  selects?: { name: string; label: string; options: { value: string; label: string }[]; allLabel?: string }[];
  /** Muestra filtros de fecha «desde» y «hasta» (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD) */
  dates?: boolean;
  hideSearch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const push = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    start(() => router.replace(`${pathname}?${next}`));
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) push("q", q.trim());
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      {!hideSearch && <label className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 sm:max-w-sm">
        <Search className="h-4 w-4 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm outline-none" aria-label="Buscar" maxLength={60} />
      </label>}
      {selects.map((s) => (
        <select
          key={s.name}
          aria-label={s.label}
          value={params.get(s.name) ?? ""}
          onChange={(e) => push(s.name, e.target.value)}
          className="h-10 rounded-full border border-border bg-surface px-4 text-sm"
        >
          <option value="">{s.allLabel ?? `${s.label}: todos`}</option>
          {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {dates && (
        <>
          <label className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted">
            Desde <input type="date" value={params.get("desde") ?? ""} onChange={(e) => push("desde", e.target.value)} className="bg-transparent text-fg outline-none" aria-label="Desde" />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-muted">
            Hasta <input type="date" value={params.get("hasta") ?? ""} onChange={(e) => push("hasta", e.target.value)} className="bg-transparent text-fg outline-none" aria-label="Hasta" />
          </label>
        </>
      )}
    </div>
  );
}
