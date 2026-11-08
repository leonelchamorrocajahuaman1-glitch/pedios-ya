"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Lock, MapPin, Plus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useCart, toOrderItems } from "@/hooks/use-cart";
import { useQuote } from "@/hooks/use-quote";
import { useSelectedAddress } from "@/hooks/use-selected-address";
import { CartLines } from "@/components/cart/cart-lines";
import { CouponInput } from "@/components/cart/coupon-input";
import { OrderSummary } from "@/components/cart/order-summary";
import { AddressForm } from "@/components/account/address-form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { placeOrderAction } from "@/lib/actions/orders";
import type { Address, PaymentMethod, PlatformSettings } from "@/types";
import { cn } from "@/lib/utils";

const METHODS: { id: PaymentMethod; label: string; desc: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Efectivo", desc: "Pagas al recibir tu pedido", icon: Banknote },
  { id: "yape", label: "Yape", desc: "Yapeas y nos envías el N° de operación", icon: Smartphone },
  { id: "plin", label: "Plin", desc: "Transfieres y nos envías el N° de operación", icon: Smartphone },
  { id: "card", label: "Tarjeta", desc: "Crédito o débito vía Mercado Pago", icon: CreditCard },
];

export function CheckoutForm({
  addresses,
  settings,
  defaultPhone,
  cardAvailable,
}: {
  addresses: Address[];
  settings: PlatformSettings;
  defaultPhone: string;
  cardAvailable: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const { addressId, setAddressId } = useSelectedAddress();
  const [showNewAddress, setShowNewAddress] = useState(addresses.length === 0);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [referenceEdits, setReferenceEdits] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState("");
  const [changeFor, setChangeFor] = useState("");
  // Clave única por intento de compra: si el usuario hace doble clic o reintenta, no se duplica el pedido
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();

  const enabled: Record<PaymentMethod, boolean> = {
    cash: settings.payment_cash_enabled,
    yape: settings.payment_yape_enabled,
    plin: settings.payment_plin_enabled,
    card: settings.payment_card_enabled && cardAvailable,
  };
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  useEffect(() => {
    if (!selectedAddress && addresses.length) setAddressId((addresses.find((a) => a.is_default) ?? addresses[0]).id);
  }, [selectedAddress, addresses, setAddressId]);

  const reference = selectedAddress ? (referenceEdits[selectedAddress.id] ?? selectedAddress.reference ?? "") : "";
  const setReference = (v: string) => selectedAddress && setReferenceEdits((r) => ({ ...r, [selectedAddress.id]: v }));

  const { quote, error, couponError, loading } = useQuote({
    restaurantId: cart.restaurant?.id ?? null,
    items: cart.items,
    coupon: cart.coupon,
    addressId: selectedAddress?.id ?? null,
    enabled: cart.ready && Boolean(selectedAddress),
  });

  if (cart.ready && cart.items.length === 0) {
    return (
      <EmptyState
        title="No hay productos para pagar"
        description="Tu carrito está vacío."
        action={<Link href="/buscar" className={buttonStyles()}>Explorar</Link>}
      />
    );
  }

  function submit() {
    if (!cart.restaurant) return;
    if (!selectedAddress) return void toast.error("Selecciona una dirección de entrega");
    if (!method) return void toast.error("Elige un método de pago");
    start(async () => {
      const res = await placeOrderAction({
        restaurant_id: cart.restaurant!.id,
        items: toOrderItems(cart.items),
        address_id: selectedAddress.id,
        payment_method: method,
        idempotency_key: idempotencyKey,
        coupon_code: couponError ? undefined : cart.coupon ?? undefined,
        notes: notes || undefined,
        reference: reference || undefined,
        contact_phone: phone || undefined,
        cash_change_for: method === "cash" && changeFor ? Number(changeFor) : undefined,
      });
      if (!res.ok) return void toast.error(res.error);
      cart.clear();
      toast.success("¡Pedido creado!");
      if (res.data!.redirectTo.startsWith("http")) window.location.href = res.data!.redirectTo;
      else router.push(res.data!.redirectTo);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-brand" /> Dirección de entrega</CardTitle>
            {addresses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowNewAddress(true)}><Plus className="h-4 w-4" /> Nueva</Button>
            )}
          </CardHeader>
          <CardBody className="space-y-3">
            {addresses.length === 0 && <AddressForm onSaved={(id) => { setAddressId(id); router.refresh(); }} />}
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAddressId(a.id)}
                  className={cn("rounded-2xl border p-4 text-left transition", a.id === selectedAddress?.id ? "border-brand bg-brand/5 ring-4 ring-[var(--ring)]" : "border-border hover:border-fg/30")}
                >
                  <p className="font-semibold">{a.label}</p>
                  <p className="text-sm text-muted">{a.street}, {a.district}</p>
                  {a.lat == null && <p className="mt-1 text-xs text-warning">Sin ubicación en el mapa</p>}
                </button>
              ))}
            </div>
            {selectedAddress && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <Field label="Referencias de ubicación" htmlFor="reference">
                  <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={250} placeholder="Ej. edificio azul, timbre 402" />
                </Field>
                <Field label="Teléfono de contacto" htmlFor="phone">
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="987 654 321" />
                </Field>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Método de pago</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {METHODS.map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  disabled={!enabled[id]}
                  onClick={() => setMethod(id)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                    method === id ? "border-brand bg-brand/5 ring-4 ring-[var(--ring)]" : "border-border hover:border-fg/30",
                  )}
                >
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", id === "yape" ? "bg-[#742284] text-white" : id === "plin" ? "bg-[#00b4c5] text-white" : "bg-surface-2")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-xs text-muted">{enabled[id] ? desc : "No disponible por ahora"}</span>
                  </span>
                </button>
              ))}
            </div>
            {method === "cash" && (
              <Field label="¿Con cuánto pagarás? (opcional)" htmlFor="change" hint="Para que el repartidor lleve vuelto.">
                <Input id="change" type="number" min={0} step="0.10" inputMode="decimal" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="100.00" />
              </Field>
            )}
            {(method === "yape" || method === "plin") && (
              <p className="rounded-2xl bg-info/10 p-4 text-sm text-info">
                Después de confirmar verás el número {method === "yape" ? "Yape" : "Plin"} del comercio
                {settings.wallet_holder_name && ` (${settings.wallet_holder_name})`}. Tu pago quedará <strong>por verificar</strong> hasta que nuestro
                equipo confirme la operación.
              </p>
            )}
            {method === "card" && (
              <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Serás redirigido a Mercado Pago. No guardamos los datos de tu tarjeta. El pedido se confirma cuando Mercado Pago aprueba el pago.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notas para el restaurante</CardTitle></CardHeader>
          <CardBody>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={250} placeholder="Ej. enviar cubiertos, tocar el timbre…" />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Resumen · {cart.restaurant?.name}</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <CartLines editable={false} />
            <CouponInput value={cart.coupon} error={couponError} onApply={cart.setCoupon} />
            {selectedAddress ? <OrderSummary quote={quote} loading={loading} error={error} /> : <p className="text-sm text-muted">Elige una dirección para calcular el envío.</p>}
            <Button size="lg" className="w-full" onClick={submit} loading={pending} disabled={!quote || Boolean(error) || !method || loading}>
              {method === "card" ? "Ir a pagar con tarjeta" : "Confirmar pedido"}
            </Button>
            <p className="text-center text-xs text-muted">Al confirmar aceptas los <Link href="/terminos" className="underline">términos del servicio</Link>.</p>
          </CardBody>
        </Card>
      </div>

      <Dialog open={showNewAddress && addresses.length > 0} onClose={() => setShowNewAddress(false)} title="Nueva dirección">
        <div className="p-6">
          <AddressForm
            onSaved={(id) => {
              setAddressId(id);
              setShowNewAddress(false);
              router.refresh();
            }}
          />
        </div>
      </Dialog>
    </div>
  );
}
