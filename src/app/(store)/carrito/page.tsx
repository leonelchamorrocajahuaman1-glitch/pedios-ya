"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, Truck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useQuote } from "@/hooks/use-quote";
import { CartLines } from "@/components/cart/cart-lines";
import { CouponInput } from "@/components/cart/coupon-input";
import { OrderSummary } from "@/components/cart/order-summary";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonStyles } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cn } from "@/lib/utils";
import { formatPEN } from "@/lib/format";

export default function CartPage() {
  const cart = useCart();
  const { quote, error, errorCode, couponError, loading } = useQuote({ items: cart.items, coupon: cart.coupon, fulfillment: "delivery", enabled: cart.ready });

  if (!cart.ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<ShoppingCart />} title="Tu carrito está vacío" description="Agrega productos y aquí verás tu compra." action={<Link href="/productos" className={buttonStyles()}>Ver productos</Link>} />
      </div>
    );
  }
  // La compra mínima no impide ver el carrito; solo bloquea el paso al pago
  const blocked = !quote || (Boolean(error) && errorCode !== "MIN_ORDER");
  const minOrder = errorCode === "MIN_ORDER";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Tu carrito</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardBody>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold">{cart.count} producto{cart.count === 1 ? "" : "s"}</p>
              <ConfirmButton variant="ghost" size="sm" title="¿Vaciar carrito?" description="Se quitarán todos los productos." confirmLabel="Vaciar" onConfirm={() => cart.clear()}>Vaciar</ConfirmButton>
            </div>
            <CartLines lines={quote?.lines} />
            <Link href="/productos" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">+ Seguir comprando</Link>
          </CardBody>
        </Card>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardBody className="space-y-5">
              <CouponInput value={cart.coupon} error={couponError} onApply={cart.setCoupon} />
              {minOrder ? (
                <div className="flex justify-between text-sm"><span className="text-muted">Subtotal estimado</span><span className="font-semibold">{formatPEN(cart.estimatedSubtotal)}</span></div>
              ) : (
                <OrderSummary quote={quote} loading={loading} error={error} />
              )}
              {minOrder && <p className="rounded-2xl bg-warning/12 px-4 py-3 text-sm font-medium text-warning">{error} Agrega más productos para continuar.</p>}
              <p className="flex items-start gap-2 text-xs text-muted"><Truck className="mt-0.5 h-4 w-4 shrink-0" /> El costo final de delivery se confirma según tu dirección. También puedes recoger en tienda.</p>
              <Link href="/checkout" aria-disabled={blocked || minOrder} className={cn(buttonStyles({ size: "lg" }), "w-full", (blocked || minOrder) && "pointer-events-none opacity-50")}>
                Continuar con la compra <ArrowRight className="h-5 w-5" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
