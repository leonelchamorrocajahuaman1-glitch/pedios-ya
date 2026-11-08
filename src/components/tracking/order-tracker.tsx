"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Phone, Receipt, Star } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cancelOrderAction, reportWalletPaymentAction, submitReviewAction } from "@/lib/actions/account";
import { startCardPayment } from "@/lib/actions/orders";
import { ORDER_FLOW, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import type { Order, OrderStatusHistory, Payment, PlatformSettings } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SmartImage } from "@/components/ui/smart-image";
import { TrackingMap } from "./tracking-map";
import { StatusTimeline } from "./status-timeline";
import { cn } from "@/lib/utils";

interface CourierInfo {
  full_name: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  phone: string;
  last_lat: number | null;
  last_lng: number | null;
}

export function OrderTracker({
  initialOrder,
  initialHistory,
  settings,
  hasReview,
  paymentFlag,
}: {
  initialOrder: Order;
  initialHistory: OrderStatusHistory[];
  settings: Pick<PlatformSettings, "yape_phone" | "plin_phone" | "wallet_holder_name" | "support_phone">;
  hasReview: boolean;
  paymentFlag?: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [history, setHistory] = useState(initialHistory);
  const [payments, setPayments] = useState<Payment[]>(initialOrder.payments ?? []);
  const [courier, setCourier] = useState<CourierInfo | null>(null);
  const [courierPos, setCourierPos] = useState<{ lat: number; lng: number } | null>(null);
  const [live, setLive] = useState(false);
  const [pending, start] = useTransition();

  const loadCourier = useCallback(
    () =>
      getSupabaseBrowserClient()
        .rpc("get_order_courier", { p_order_id: initialOrder.id })
        .then(({ data }) => {
          const c = (data as CourierInfo[] | null)?.[0] ?? null;
          setCourier(c);
          if (c?.last_lat != null && c?.last_lng != null) setCourierPos((p) => p ?? { lat: c.last_lat!, lng: c.last_lng! });
        }),
    [initialOrder.id],
  );

  useEffect(() => {
    loadCourier();
    const supabase = getSupabaseBrowserClient();
    const id = initialOrder.id;
    const channel = supabase
      .channel(`order:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        const next = payload.new as Order;
        setOrder((o) => {
          if (o.status !== next.status) toast(ORDER_STATUS_LABEL[next.status]);
          return { ...o, ...next };
        });
        if (next.courier_id) loadCourier();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=eq.${id}` }, (payload) =>
        setHistory((h) => [...h, payload.new as OrderStatusHistory]),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_locations", filter: `order_id=eq.${id}` }, (payload) => {
        const p = payload.new as { lat: number; lng: number };
        setCourierPos({ lat: p.lat, lng: p.lng });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${id}` }, (payload) => {
        const p = payload.new as Payment;
        setPayments((list) => [...list.filter((x) => x.id !== p.id), p]);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // Respaldo por si la conexión en tiempo real se corta: refresco cada 30 s
    const interval = setInterval(async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (data) setOrder((o) => ({ ...o, ...(data as Order) }));
      const { data: last } = await supabase
        .from("delivery_locations")
        .select("lat, lng")
        .eq("order_id", id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last) setCourierPos({ lat: last.lat, lng: last.lng });
    }, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [initialOrder.id, loadCourier]);

  useEffect(() => {
    if (paymentFlag === "procesando") toast.message("Estamos confirmando tu pago con Mercado Pago…");
    if (paymentFlag === "fallido") toast.error("El pago no se completó. Puedes intentarlo nuevamente.");
    if (paymentFlag === "error") toast.error("No se pudo iniciar el pago con tarjeta. Inténtalo otra vez.");
  }, [paymentFlag]);

  const r = order.restaurants;
  const stepIndex = ORDER_FLOW.indexOf(order.status);
  const inTransit = ["courier_assigned", "picked_up", "on_the_way"].includes(order.status);
  const payment = [...payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const walletPhone = order.payment_method === "yape" ? settings.yape_phone : order.payment_method === "plin" ? settings.plin_phone : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="relative bg-gradient-to-br from-brand to-accent p-6 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm opacity-85">Pedido {order.code}</p>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse bg-lime" : "bg-white/50")} /> {live ? "En vivo" : "Conectando…"}
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">{ORDER_STATUS_LABEL[order.status]}</h1>
            {order.status !== "cancelled" && order.status !== "delivered" && r && (
              <p className="mt-1 text-sm opacity-90">Entrega estimada: {r.delivery_time_min}–{r.delivery_time_max} min desde la aceptación</p>
            )}
            {order.status !== "cancelled" && (
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${((stepIndex + 1) / ORDER_FLOW.length) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="h-80">
            <TrackingMap
              restaurant={r?.lat != null && r?.lng != null ? { lat: r.lat, lng: r.lng } : null}
              destination={order.delivery_lat != null && order.delivery_lng != null ? { lat: order.delivery_lat, lng: order.delivery_lng } : null}
              courier={inTransit ? courierPos : null}
            />
          </div>
        </Card>

        {courier && inTransit && (
          <Card>
            <CardBody className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success"><Bike className="h-6 w-6" /></span>
              <div className="flex-1">
                <p className="font-semibold">{courier.full_name}</p>
                <p className="text-sm capitalize text-muted">{courier.vehicle_type.replace("_", " ")}{courier.vehicle_plate && ` · ${courier.vehicle_plate}`}</p>
              </div>
              <a href={`tel:${courier.phone.replace(/\s/g, "")}`} className="grid h-11 w-11 place-items-center rounded-full bg-success text-white" aria-label="Llamar al repartidor">
                <Phone className="h-5 w-5" />
              </a>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Estado del pedido</CardTitle></CardHeader>
          <CardBody><StatusTimeline status={order.status} history={history} /></CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-brand" /> Pago</CardTitle>
            <Badge tone={PAYMENT_STATUS_TONE[order.payment_status]}>{PAYMENT_STATUS_LABEL[order.payment_status]}</Badge>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <p>Método: <strong>{PAYMENT_METHOD_LABEL[order.payment_method]}</strong> · Total <strong>{formatPEN(order.total)}</strong></p>

            {(order.payment_method === "yape" || order.payment_method === "plin") && order.status !== "cancelled" && (
              <>
                {walletPhone ? (
                  <div className="rounded-2xl bg-surface-2 p-4">
                    <p className="text-muted">Envía {formatPEN(order.total)} por {PAYMENT_METHOD_LABEL[order.payment_method]} al número:</p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-wider">{walletPhone}</p>
                    {settings.wallet_holder_name && <p className="text-xs text-muted">A nombre de {settings.wallet_holder_name}</p>}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-warning/10 p-3 text-warning">El comercio aún no configuró su número {PAYMENT_METHOD_LABEL[order.payment_method]}. Te contactaremos para coordinar el pago.</p>
                )}
                {(order.payment_status === "pending" || order.payment_status === "rejected") && (
                  <form
                    className="space-y-3"
                    action={(fd) =>
                      start(async () => {
                        const res = await reportWalletPaymentAction(fd);
                        if (!res.ok) return void toast.error(res.error);
                        toast.success(res.message);
                        setOrder((o) => ({ ...o, payment_status: "pending_verification" }));
                      })
                    }
                  >
                    <input type="hidden" name="order_id" value={order.id} />
                    <Field label="Número de operación" htmlFor="op">
                      <Input id="op" name="operation_number" required pattern="[0-9A-Za-z-]{4,30}" placeholder="Ej. 12345678" inputMode="numeric" />
                    </Field>
                    <Field label="Celular desde el que pagaste (opcional)" htmlFor="pp">
                      <Input id="pp" name="payer_phone" maxLength={20} inputMode="tel" />
                    </Field>
                    <Button type="submit" loading={pending} className="w-full">Enviar comprobante</Button>
                  </form>
                )}
                {order.payment_status === "pending_verification" && (
                  <p className="text-muted">Recibimos tu número de operación{payment?.operation_number && ` (${payment.operation_number})`}. Lo estamos verificando.</p>
                )}
              </>
            )}

            {order.payment_method === "card" && ["pending", "rejected"].includes(order.payment_status) && order.status !== "cancelled" && (
              <Button
                className="w-full"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await startCardPayment(order.id);
                    if (!res.ok) return void toast.error(res.error);
                    window.location.href = res.data!.url;
                  })
                }
              >
                Pagar con tarjeta
              </Button>
            )}
            {order.payment_method === "cash" && order.status !== "cancelled" && (
              <p className="text-muted">Paga en efectivo al recibir tu pedido. Ten el monto exacto si es posible.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{r?.name}</CardTitle>
            <span className="text-xs text-muted">{formatDateTime(order.created_at)}</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <ul className="space-y-3">
              {order.order_items?.map((i) => (
                <li key={i.id} className="flex gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <SmartImage src={i.product_image} alt={i.product_name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{i.quantity}× {i.product_name}</p>
                    {i.options?.length > 0 && <p className="text-xs text-muted">{i.options.map((o) => o.choice).join(" · ")}</p>}
                  </div>
                  <span className="text-sm font-medium">{formatPEN(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPEN(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Envío</span><span>{formatPEN(order.delivery_fee)}</span></div>
              {Number(order.service_fee) > 0 && <div className="flex justify-between"><span className="text-muted">Servicio</span><span>{formatPEN(order.service_fee)}</span></div>}
              {Number(order.discount) > 0 && <div className="flex justify-between text-success"><span>Descuento</span><span>− {formatPEN(order.discount)}</span></div>}
              <div className="flex justify-between pt-1 font-display text-lg font-bold"><span>Total</span><span>{formatPEN(order.total)}</span></div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3 text-sm">
              <p className="font-medium">{order.delivery_address}{order.delivery_district && `, ${order.delivery_district}`}</p>
              {order.delivery_reference && <p className="text-xs text-muted">Ref.: {order.delivery_reference}</p>}
              {order.notes && <p className="mt-1 text-xs text-muted">Notas: {order.notes}</p>}
            </div>
            {order.status === "received" && order.payment_status !== "approved" && (
              <ConfirmButton
                variant="outline"
                className="w-full text-danger"
                title="¿Cancelar pedido?"
                description="Solo puedes cancelar antes de que el restaurante acepte el pedido."
                confirmLabel="Sí, cancelar"
                onConfirm={async () => {
                  const res = await cancelOrderAction(order.id);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success(res.message);
                    router.refresh();
                  }
                }}
              >
                Cancelar pedido
              </ConfirmButton>
            )}
          </CardBody>
        </Card>

        {order.status === "delivered" && !hasReview && <ReviewForm orderId={order.id} />}
        {order.status === "delivered" && r && (
          <Link href={`/restaurante/${r.slug}`} className="block text-center text-sm font-semibold text-brand hover:underline">
            Volver a pedir en {r.name}
          </Link>
        )}
      </div>
    </div>
  );
}

function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <Card><CardBody className="text-center text-sm">¡Gracias por calificar! ⭐</CardBody></Card>;
  return (
    <Card>
      <CardHeader><CardTitle>¿Qué tal estuvo tu pedido?</CardTitle></CardHeader>
      <CardBody>
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              fd.set("rating", String(rating));
              const res = await submitReviewAction(fd);
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setDone(true);
            })
          }
        >
          <input type="hidden" name="order_id" value={orderId} />
          <div className="flex gap-2" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} role="radio" aria-checked={rating === n} aria-label={`${n} estrellas`}>
                <Star className={cn("h-9 w-9 transition", n <= rating ? "fill-warning text-warning" : "text-border hover:text-warning/60")} />
              </button>
            ))}
          </div>
          <Textarea name="comment" maxLength={500} placeholder="Cuéntanos tu experiencia (opcional)" />
          <Button type="submit" disabled={!rating} loading={pending}>Enviar calificación</Button>
        </form>
      </CardBody>
    </Card>
  );
}
