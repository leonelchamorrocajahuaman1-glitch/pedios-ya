"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
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

export default function CartPage() {
  const cart = useCart();
  const { quote, error, couponError, loading } = useQuote({
    restaurantId: cart.restaurant?.id ?? null,
    items: cart.items,
    coupon: cart.coupon,
    enabled: cart.ready,
  });

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
        <EmptyState
          icon={<ShoppingBag />}
          title="Tu carrito está vacío"
          description="Explora los restaurantes y agrega tus antojos."
          action={<Link href="/buscar" className={buttonStyles()}>Explorar restaurantes</Link>}
        />
      </div>
    );
  }

  const blocked = Boolean(error) || !quote;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Tu carrito</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardBody>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Link href={`/restaurante/${cart.restaurant?.slug}`} className="font-display text-lg font-semibold hover:text-brand">
                {cart.restaurant?.name}
              </Link>
              <ConfirmButton variant="ghost" size="sm" title="¿Vaciar carrito?" description="Se eliminarán todos los productos." confirmLabel="Vaciar" onConfirm={() => cart.clear()}>
                Vaciar
              </ConfirmButton>
            </div>
            <CartLines />
            <Link href={`/restaurante/${cart.restaurant?.slug}`} className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
              + Agregar más productos
            </Link>
          </CardBody>
        </Card>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardBody className="space-y-5">
              <CouponInput value={cart.coupon} error={couponError} onApply={cart.setCoupon} />
              <OrderSummary quote={quote} loading={loading} error={error} />
              <p className="text-xs text-muted">El costo de envío final se ajusta a la distancia de tu dirección en el siguiente paso.</p>
              <Link
                href="/checkout"
                aria-disabled={blocked}
                className={cn(buttonStyles({ size: "lg" }), "w-full", blocked && "pointer-events-none opacity-50")}
              >
                Continuar al pago <ArrowRight className="h-5 w-5" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
