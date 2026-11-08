"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Phone, Receipt, Store, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cancelOrderAction, reportPaymentAction } from "@/lib/actions/orders";
import { uploadPaymentProof } from "@/lib/proof-upload";
import { ORDER_STATUS_CUSTOMER, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import type { Order, OrderStatusHistory, Payment, PaymentMethodConfig } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SmartImage } from "@/components/ui/smart-image";
import { WalletPayment } from "@/components/checkout/wallet-payment";
import { StatusTimeline } from "./status-timeline";
import { cn } from "@/lib/utils";

export function OrderTracker({ initialOrder, initialHistory, walletMethod, isNew, confirmationMessage, userId }: {
  initialOrder: Order;
  initialHistory: OrderStatusHistory[];
  walletMethod: PaymentMethodConfig | null;
  isNew: boolean;
  confirmationMessage: string;
  userId: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [history, setHistory] = useState(initialHistory);
  const [payments, setPayments] = useState<Payment[]>(initialOrder.payments ?? []);
  const [live, setLive] = useState(false);
  const [operation, setOperation] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const id = initialOrder.id;
    const channel = supabase
      .channel(`order:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        const next = payload.new as Order;
        setOrder((o) => {
          if (o.status !== next.status) toast(ORDER_STATUS_CUSTOMER[next.status]);
          return { ...o, ...next };
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=eq.${id}` }, (payload) =>
        setHistory((h) => [...h, payload.new as OrderStatusHistory]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${id}` }, (payload) => {
        const p = payload.new as Payment;
        setPayments((list) => [...list.filter((x) => x.id !== p.id), p]);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    // Respaldo si la conexión en tiempo real se interrumpe
    const interval = setInterval(async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (data) setOrder((o) => ({ ...o, ...(data as Order) }));
    }, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [initialOrder.id]);

  const payment = [...payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const wallet = order.payment_method === "yape" || order.payment_method === "plin";
  const canReport = wallet && order.status !== "cancelled" && ["pending", "rejected"].includes(order.payment_status);

  function report() {
    if (!/^[0-9A-Za-z-]{4,30}$/.test(operation)) return void toast.error("Ingresa el número de operación");
    start(async () => {
      let path: string | null = null;
      if (proof) {
        const up = await uploadPaymentProof(userId, proof);
        if (up.error) return void toast.error(up.error);
        path = up.path ?? null;
      }
      const res = await reportPaymentAction({ order_id: order.id, reference: operation, proof_path: path });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOrder((o) => ({ ...o, payment_status: "pending_verification" }));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {isNew && (
        <div className="flex items-start gap-4 rounded-3xl border border-brand/30 bg-brand/10 p-5">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-brand" />
          <div>
            <p className="font-display text-xl font-bold">¡Pedido {order.code} registrado!</p>
            <p className="text-sm text-muted">{confirmationMessage}</p>
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative bg-gradient-to-br from-brand-strong to-brand p-6 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm opacity-90">Pedido {order.code}</p>
                <span className="flex items-center gap-1.5 text-xs"><span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse bg-lime" : "bg-white/50")} /> {live ? "En vivo" : "Conectando…"}</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold">{ORDER_STATUS_CUSTOMER[order.status]}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm opacity-90">
                {order.fulfillment === "pickup" ? <><Store className="h-4 w-4" /> Recojo en tienda</> : <><Truck className="h-4 w-4" /> Delivery a domicilio</>}
              </p>
            </div>
            <CardBody><StatusTimeline status={order.status} history={history} fulfillment={order.fulfillment} /></CardBody>
          </Card>
          {order.delivery_person_name && ["ready", "on_the_way"].includes(order.status) && (
            <Card>
              <CardBody className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><User className="h-6 w-6" /></span>
                <div className="flex-1"><p className="text-xs text-muted">Te lo lleva</p><p className="font-semibold">{order.delivery_person_name}</p></div>
                {order.delivery_person_phone && (
                  <a href={`tel:${order.delivery_person_phone.replace(/\s/g, "")}`} className="grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-fg" aria-label="Llamar"><Phone className="h-5 w-5" /></a>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-brand" /> Pago</CardTitle>
              <Badge tone={PAYMENT_STATUS_TONE[order.payment_status]}>{PAYMENT_STATUS_LABEL[order.payment_status]}</Badge>
            </CardHeader>
            <CardBody className="space-y-4 text-sm">
              <p>Método: <strong>{PAYMENT_METHOD_LABEL[order.payment_method]}</strong> · Total <strong>{formatPEN(order.total)}</strong></p>
              {order.payment_status === "pending_verification" && <p className="rounded-2xl bg-warning/10 p-3 text-warning">Recibimos tu comprobante{payment?.operation_number && ` (operación ${payment.operation_number})`}. Lo estamos verificando.</p>}
              {order.payment_status === "rejected" && <p className="rounded-2xl bg-danger/10 p-3 text-danger">No pudimos verificar tu pago{payment?.review_note ? `: ${payment.review_note}` : ""}. Revisa los datos y vuelve a enviarlo.</p>}
              {canReport && walletMethod && (
                <>
                  <WalletPayment method={walletMethod} total={Number(order.total)} reference={operation} onReference={setOperation} file={proof} onFile={setProof} />
                  <Button className="w-full" loading={pending} onClick={report}>Enviar comprobante</Button>
                </>
              )}
              {order.payment_method === "cash" && order.status !== "cancelled" && <p className="text-muted">Paga en efectivo {order.fulfillment === "pickup" ? "al recoger" : "al recibir"} tu pedido.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detalle</CardTitle><span className="text-xs text-muted">{formatDateTime(order.created_at)}</span></CardHeader>
            <CardBody className="space-y-4">
              <ul className="space-y-3">
                {order.order_items?.map((i) => (
                  <li key={i.id} className="flex gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2"><SmartImage src={i.product_image} alt="" fill sizes="48px" className="object-cover" /></div>
                    <div className="min-w-0 flex-1 text-sm"><p className="font-medium">{i.quantity} × {i.product_name}</p><p className="text-xs text-muted">{formatPEN(i.unit_price)} c/u</p></div>
                    <span className="text-sm font-medium">{formatPEN(i.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPEN(order.subtotal)}</span></div>
                {Number(order.discount) > 0 && <div className="flex justify-between text-accent"><span>Descuentos</span><span>− {formatPEN(order.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted">{order.fulfillment === "pickup" ? "Recojo" : "Delivery"}</span><span>{Number(order.delivery_fee) === 0 ? "Gratis" : formatPEN(order.delivery_fee)}</span></div>
                <div className="flex justify-between pt-1 font-display text-lg font-bold"><span>Total</span><span>{formatPEN(order.total)}</span></div>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3 text-sm">
                <p className="flex items-start gap-2 font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {order.delivery_address}{order.delivery_district && `, ${order.delivery_district}`}</p>
                {order.delivery_reference && <p className="text-xs text-muted">Ref.: {order.delivery_reference}</p>}
                <p className="mt-1 text-xs text-muted">{order.customer_name} · {order.contact_phone}</p>
                {order.notes && <p className="mt-1 text-xs text-muted">Observaciones: {order.notes}</p>}
              </div>
              {order.status === "received" && order.payment_status !== "approved" && (
                <ConfirmButton variant="outline" className="w-full text-danger" title="¿Cancelar pedido?" description="Solo puedes cancelar antes de que confirmemos tu pedido. Los productos vuelven al stock." confirmLabel="Sí, cancelar"
                  onConfirm={async () => {
                    const res = await cancelOrderAction(order.id);
                    if (!res.ok) toast.error(res.error);
                    else { toast.success(res.message); router.refresh(); }
                  }}>
                  Cancelar pedido
                </ConfirmButton>
              )}
            </CardBody>
          </Card>
          <Link href="/cuenta/pedidos" className="block text-center text-sm font-semibold text-brand hover:underline">Ver todos mis pedidos</Link>
        </div>
      </div>
    </div>
  );
}
