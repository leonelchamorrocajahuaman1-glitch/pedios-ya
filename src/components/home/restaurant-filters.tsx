"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "recommended", label: "Recomendados" },
  { value: "rating", label: "Mejor calificados" },
  { value: "delivery_time", label: "Más rápidos" },
  { value: "delivery_fee", label: "Menor envío" },
];

/** Filtros por URL (compartibles y procesados en el servidor). */
export function RestaurantFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const chip = (active: boolean) =>
    cn(
      "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition",
      active ? "border-fg bg-fg text-bg" : "border-border bg-surface hover:border-fg/40",
    );

  return (
    <div className={cn("scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0", pending && "opacity-60")}>
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      {SORTS.map((s) => (
        <button
          key={s.value}
          className={chip((params.get("orden") ?? "recommended") === s.value)}
          onClick={() => set("orden", s.value === "recommended" ? null : s.value)}
        >
          {s.label}
        </button>
      ))}
      <button className={chip(params.get("abiertos") === "1")} onClick={() => set("abiertos", params.get("abiertos") === "1" ? null : "1")}>
        Abiertos ahora
      </button>
      <button className={chip(params.get("envio") === "gratis")} onClick={() => set("envio", params.get("envio") === "gratis" ? null : "gratis")}>
        Envío gratis
      </button>
    </div>
  );
}
