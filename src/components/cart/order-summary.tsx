import { Loader2 } from "lucide-react";
import type { OrderQuote } from "@/types";
import { formatPEN } from "@/lib/format";

export function OrderSummary({ quote, loading, error }: { quote: OrderQuote | null; loading?: boolean; error?: string | null }) {
  const row = (label: string, value: string, cls = "") => (
    <div className={`flex justify-between text-sm ${cls}`}>
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
  return (
    <div className="space-y-2.5">
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {quote ? (
        <>
          {row("Subtotal", formatPEN(quote.subtotal))}
          {row(
            `Envío${quote.distance_km != null ? ` (${Number(quote.distance_km).toFixed(1)} km)` : ""}`,
            Number(quote.delivery_fee) === 0 ? "Gratis" : formatPEN(quote.delivery_fee),
          )}
          {Number(quote.service_fee) > 0 && row("Tarifa de servicio", formatPEN(quote.service_fee))}
          {Number(quote.discount) > 0 && row(`Descuento${quote.coupon_code ? ` (${quote.coupon_code})` : ""}`, `− ${formatPEN(quote.discount)}`, "text-success")}
          <div className="my-2 border-t border-dashed border-border" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="flex items-center gap-2 font-display text-2xl font-bold">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
              {formatPEN(quote.total)}
            </span>
          </div>
          <p className="text-xs text-muted">Precios calculados por el sistema con IGV incluido.</p>
        </>
      ) : (
        !error && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando totales…
          </div>
        )
      )}
    </div>
  );
}
