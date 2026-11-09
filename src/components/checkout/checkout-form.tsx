"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, MapPin, Plus, Smartphone, Store, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { useCart, toOrderItems } from "@/hooks/use-cart";
import { useQuote } from "@/hooks/use-quote";
import { CartLines } from "@/components/cart/cart-lines";
import { CouponInput } from "@/components/cart/coupon-input";
import { OrderSummary } from "@/components/cart/order-summary";
import { AddressForm } from "@/components/account/address-form";
import { WalletPayment } from "./wallet-payment";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { placeOrderAction, reportPaymentAction } from "@/lib/actions/orders";
import { uploadPaymentProof } from "@/lib/proof-upload";
import { formatPEN } from "@/lib/format";
import type { Address, Fulfillment, PaymentMethod, PaymentMethodConfig, StoreSettings } from "@/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Banknote> = { cash: Banknote, yape: Smartphone, plin: Smartphone };

export function CheckoutForm({ userId, addresses, settings, methods, defaultName, defaultPhone }: {
  userId: string;
  addresses: Address[];
  settings: StoreSettings;
  methods: PaymentMethodConfig[];
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const cart = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>(settings.delivery_enabled ? "delivery" : "pickup");
  const [pickedAddressId, setAddressId] = useState<string | null>(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null);
  // Si la dirección elegida ya no existe (o se agregó la primera), se usa la primera disponible
  const addressId = addresses.some((a) => a.id === pickedAddressId) ? pickedAddressId : (addresses[0]?.id ?? null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [referenceEdits, setReferenceEdits] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [operation, setOperation] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  // Una clave por intento: doble clic o reintentos nunca crean dos pedidos
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();

  const selected = addresses.find((a) => a.id === addressId) ?? null;
  const reference = selected ? (referenceEdits[selected.id] ?? selected.reference ?? "") : "";
  const { quote, error, couponError, loading } = useQuote({
    items: cart.items,
    coupon: cart.coupon,
    fulfillment,
    addressId: fulfillment === "delivery" ? addressId : null,
    enabled: cart.ready,
  });
  const methodConfig = methods.find((m) => m.code === method);
  const wallet = method === "yape" || method === "plin";

  if (cart.ready && cart.items.length === 0) {
    return <EmptyState title="No hay productos para pagar" description="Tu carrito está vacío." action={<Link href="/productos" className={buttonStyles()}>Ver productos</Link>} />;
  }

  function submit() {
    if (name.trim().length < 2) return void toast.error("Ingresa tu nombre");
    if (!/^\+?[0-9 ]{6,20}$/.test(phone.trim())) return void toast.error("Ingresa un teléfono válido");
    if (fulfillment === "delivery" && !selected) return void toast.error("Agrega una dirección de entrega");
    if (!method) return void toast.error("Elige un método de pago");
    if (wallet && operation && !/^[0-9A-Za-z-]{4,30}$/.test(operation)) return void toast.error("Número de operación inválido");
    start(async () => {
      let proofPath: string | null = null;
      if (wallet && proof) {
        const up = await uploadPaymentProof(userId, proof);
        if (up.error) return void toast.error(up.error);
        proofPath = up.path ?? null;
      }
      const res = await placeOrderAction({
        items: toOrderItems(cart.items),
        fulfillment,
        payment_method: method as "cash" | "yape" | "plin",
        idempotency_key: idempotencyKey,
        customer_name: name,
        contact_phone: phone,
        address_id: fulfillment === "delivery" ? selected?.id : null,
        reference,
        coupon_code: couponError ? undefined : cart.coupon ?? undefined,
        notes,
      });
      if (!res.ok) return void toast.error(res.error);
      const orderId = res.data!.orderId;
      if (wallet && operation) {
        const rep = await reportPaymentAction({ order_id: orderId, reference: operation, proof_path: proofPath });
        if (!rep.ok) toast.error(`Pedido creado, pero no se registró el pago: ${rep.error}. Puedes enviarlo desde el detalle del pedido.`);
      }
      cart.clear();
      router.push(`/pedidos/${orderId}?nuevo=1`);
    });
  }

  const sectionBtn = (active: boolean) => cn("flex items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45", active ? "border-brand bg-brand/5 ring-4 ring-[var(--ring)]" : "border-border hover:border-fg/30");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-brand" /> Tus datos</CardTitle></CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="cname"><Input id="cname" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} /></Field>
            <Field label="Teléfono / WhatsApp" htmlFor="cphone"><Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="987 654 321" maxLength={20} /></Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-brand" /> Modalidad de entrega</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button disabled={!settings.delivery_enabled} onClick={() => setFulfillment("delivery")} className={sectionBtn(fulfillment === "delivery")}>
                <Truck className="h-6 w-6 shrink-0 text-brand" />
                <span><span className="block font-semibold">Delivery a domicilio</span><span className="block text-xs text-muted">{settings.delivery_enabled ? `Desde ${formatPEN(settings.delivery_fee)} · ${settings.delivery_eta}` : "No disponible ahora"}</span></span>
              </button>
              <button disabled={!settings.pickup_enabled} onClick={() => setFulfillment("pickup")} className={sectionBtn(fulfillment === "pickup")}>
                <Store className="h-6 w-6 shrink-0 text-brand" />
                <span><span className="block font-semibold">Recojo en tienda</span><span className="block text-xs text-muted">{settings.pickup_enabled ? `Gratis${settings.address ? ` · ${settings.address}` : ""}` : "No disponible ahora"}</span></span>
              </button>
            </div>

            {fulfillment === "delivery" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-brand" /> Dirección de entrega</p>
                  {addresses.length > 0 && <Button variant="ghost" size="sm" onClick={() => setShowNewAddress(true)}><Plus className="h-4 w-4" /> Nueva</Button>}
                </div>
                {addresses.length === 0 ? (
                  <AddressForm onSaved={(id) => { setAddressId(id); router.refresh(); }} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <button key={a.id} onClick={() => setAddressId(a.id)} className={sectionBtn(a.id === addressId)}>
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                        <span><span className="block font-semibold">{a.label}</span><span className="block text-sm text-muted">{a.street}, {a.district}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {selected && (
                  <Field label="Referencia de ubicación" htmlFor="ref">
                    <Input id="ref" value={reference} onChange={(e) => setReferenceEdits((r) => ({ ...r, [selected.id]: e.target.value }))} maxLength={250} placeholder="Ej. casa de 2 pisos, puerta verde" />
                  </Field>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Método de pago</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {methods.map((m) => {
                const Icon = ICONS[m.code] ?? Banknote;
                const unavailable = (m.code === "yape" || m.code === "plin") && !m.phone_number;
                return (
                  <button key={m.code} disabled={unavailable} onClick={() => setMethod(m.code)} className={sectionBtn(method === m.code)}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", m.code === "yape" ? "bg-[#742284] text-white" : m.code === "plin" ? "bg-[#00a3b4] text-white" : "bg-brand/10 text-brand")}><Icon className="h-5 w-5" /></span>
                    <span><span className="block font-semibold">{m.name}</span><span className="block text-xs text-muted">{unavailable ? "Pronto disponible" : m.code === "cash" ? "Al recibir o recoger" : "Con comprobante"}</span></span>
                  </button>
                );
              })}
            </div>
            {wallet && methodConfig && (
              <WalletPayment method={methodConfig} total={quote?.total ?? null} reference={operation} onReference={setOperation} file={proof} onFile={setProof} />
            )}
            {method === "cash" && <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">Pagarás en efectivo {fulfillment === "pickup" ? "al recoger tu pedido" : "al recibir tu pedido"}. Si necesitas vuelto, indícalo en las observaciones.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Observaciones</CardTitle></CardHeader>
          <CardBody>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Ej. pagaré con S/ 100, tocar el timbre, dejar en portería…" />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Resumen del pedido</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="max-h-72 overflow-y-auto pr-1"><CartLines editable={false} lines={quote?.lines} /></div>
            <CouponInput value={cart.coupon} error={couponError} onApply={cart.setCoupon} />
            <OrderSummary quote={quote} loading={loading} error={error} />
            {settings.checkout_message && <p className="rounded-2xl bg-brand/5 p-3 text-xs text-muted">{settings.checkout_message}</p>}
            <Button size="lg" className="w-full" onClick={submit} loading={pending} disabled={!quote || Boolean(error) || !method || loading || !settings.accepting_orders}>
              {settings.accepting_orders ? `Confirmar pedido${quote ? ` · ${formatPEN(quote.total)}` : ""}` : "Tienda cerrada"}
            </Button>
            <p className="text-center text-xs text-muted">Al confirmar aceptas los <Link href="/terminos" className="underline">términos del servicio</Link>.</p>
          </CardBody>
        </Card>
      </div>

      <Dialog open={showNewAddress} onClose={() => setShowNewAddress(false)} title="Nueva dirección">
        <div className="p-6">
          <AddressForm onSaved={(id) => { setAddressId(id); setShowNewAddress(false); router.refresh(); }} />
        </div>
      </Dialog>
    </div>
  );
}
