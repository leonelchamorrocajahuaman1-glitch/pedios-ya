import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border bg-surface", className)}>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">{children}</table></div>
    </div>
  );
}
export function Th({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("bg-surface-2/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted", className)} {...p} />;
}
export function Td({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-t border-border px-4 py-3 align-middle", className)} {...p} />;
}
export function Tr({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition hover:bg-surface-2/50", className)} {...p} />;
}

/** Paginación basada en la URL (?page=). */
export function Pagination({ page, pageSize, total, baseHref }: { page: number; pageSize: number; total: number; baseHref: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} registro(s)</p>;
  const btn = "inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm";
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">Página {page} de {pages} · {total} registros</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className={btn} href={baseHref(page - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Link> : <span className={cn(btn, "opacity-40")}><ChevronLeft className="h-4 w-4" /> Anterior</span>}
        {page < pages ? <Link className={btn} href={baseHref(page + 1)}>Siguiente <ChevronRight className="h-4 w-4" /></Link> : <span className={cn(btn, "opacity-40")}>Siguiente <ChevronRight className="h-4 w-4" /></span>}
      </div>
    </div>
  );
}
