"use client";

import { Copy, Ticket } from "lucide-react";
import { toast } from "sonner";
import type { Coupon } from "@/types";
import { formatDate, formatPEN } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";

export function couponHeadline(c: Pick<Coupon, "discount_type" | "discount_value">) {
  if (c.discount_type === "percentage") return `${Number(c.discount_value)}% OFF`;
  if (c.discount_type === "fixed") return `${formatPEN(c.discount_value)} OFF`;
  return "Envío gratis";
}

export function CouponCard({ coupon }: { coupon: Coupon }) {
  const { setCoupon } = useCart();
  return (
    <div className="relative flex overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand to-accent p-3 text-center text-white">
        <Ticket className="h-6 w-6" />
        <span className="font-display text-lg font-bold leading-tight">{couponHeadline(coupon)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <p className="text-sm font-semibold">{coupon.description || "Cupón de descuento"}</p>
        <p className="text-xs text-muted">
          {coupon.min_order_amount > 0 ? `Pedido mínimo ${formatPEN(coupon.min_order_amount)}` : "Sin pedido mínimo"}
          {coupon.expires_at && ` · Vence ${formatDate(coupon.expires_at)}`}
        </p>
        <button
          onClick={() => {
            setCoupon(coupon.code);
            navigator.clipboard?.writeText(coupon.code).catch(() => undefined);
            toast.success(`Cupón ${coupon.code} listo`, { description: "Se aplicará en tu carrito." });
          }}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-dashed border-brand px-3 py-1.5 font-mono text-sm font-bold text-brand transition hover:bg-brand/10"
        >
          {coupon.code} <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
