"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
  { value: "nuevos", label: "Más nuevos" },
  { value: "nombre", label: "Nombre A–Z" },
];

/** Filtros sincronizados con la URL (procesados en el servidor, compartibles). */
export function CatalogControls({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina");
    start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  const toggle = (key: string) => set(key, params.get(key) === "1" ? null : "1");
  const chip = (active: boolean) => cn("h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition", active ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface hover:border-brand");

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", pending && "opacity-60")}>
      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <button className={chip(params.get("ofertas") === "1")} onClick={() => toggle("ofertas")}>Ofertas</button>
        <button className={chip(params.get("destacados") === "1")} onClick={() => toggle("destacados")}>Destacados</button>
        <button className={chip(params.get("disponibles") === "1")} onClick={() => toggle("disponibles")}>Con stock</button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{total} producto{total === 1 ? "" : "s"}</span>
        <select
          aria-label="Ordenar"
          value={params.get("orden") ?? "relevancia"}
          onChange={(e) => set("orden", e.target.value === "relevancia" ? null : e.target.value)}
          className="h-10 rounded-full border border-border bg-surface px-4 text-sm"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}
