import { Loader2 } from "lucide-react";
import type { CartQuote } from "@/types";
import { formatPEN } from "@/lib/format";

export function OrderSummary({ quote, loading, error }: { quote: CartQuote | null; loading?: boolean; error?: string | null }) {
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
          {row(`Subtotal (${quote.items_count} producto${quote.items_count === 1 ? "" : "s"})`, formatPEN(quote.subtotal))}
          {Number(quote.promotion_discount) > 0 && row(quote.promotion_name ?? "Promoción", `− ${formatPEN(quote.promotion_discount)}`, "text-accent")}
          {Number(quote.coupon_discount) > 0 && row(`Cupón ${quote.coupon_code ?? ""}`, `− ${formatPEN(quote.coupon_discount)}`, "text-accent")}
          {row(quote.fulfillment === "pickup" ? "Recojo en tienda" : "Delivery", Number(quote.delivery_fee) === 0 ? "Gratis" : formatPEN(quote.delivery_fee))}
          <div className="my-2 border-t border-dashed border-border" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="flex items-center gap-2 font-display text-2xl font-bold">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
              {formatPEN(quote.total)}
            </span>
          </div>
          <p className="text-xs text-muted">Precios y stock verificados por el sistema. IGV incluido.</p>
        </>
      ) : (
        !error && (
          <div className="space-y-2 py-2" aria-busy>
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
            <div className="h-7 w-full animate-pulse rounded bg-surface-2" />
          </div>
        )
      )}
    </div>
  );
}
