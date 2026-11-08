import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, Store } from "lucide-react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrderAdminControls } from "@/components/admin/order-admin-controls";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { StatusTimeline } from "@/components/tracking/status-timeline";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import type { Order, OrderStatusHistory, Payment } from "@/types";

export const metadata: Metadata = { title: "Detalle de pedido" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: history }] = await Promise.all([
    supabase.from("orders").select("*, profiles(id, full_name, email, phone), order_items(*), payments(*)").eq("id", id).eq("catalog", "store").maybeSingle(),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
  ]);
  if (!data) notFound();
  const o = data as Order;
  const payments = ((o.payments ?? []) as Payment[]).sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="space-y-6">
      <LiveRefresh notifyInsert={false} />
      <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Pedidos</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{o.code}</h1>
        <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
        <Badge tone={PAYMENT_STATUS_TONE[o.payment_status]}>{PAYMENT_METHOD_LABEL[o.payment_method]} · {PAYMENT_STATUS_LABEL[o.payment_status]}</Badge>
        <Badge tone="neutral">{o.fulfillment === "pickup" ? "Recojo en tienda" : "Delivery"}</Badge>
        <span className="text-sm text-muted">{formatDateTime(o.created_at)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              {o.order_items?.map((i) => (
                <div key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {i.product_image && <SmartImage src={i.product_image} alt="" fill sizes="48px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.quantity} × {i.product_name}</p>
                    <p className="text-xs text-muted">
                      {formatPEN(i.unit_price)} c/u
                      {i.original_price != null && Number(i.original_price) > Number(i.unit_price) && <> · antes {formatPEN(i.original_price)}</>}
                      {i.sku && <> · SKU {i.sku}</>}
                    </p>
                  </div>
                  <span className="font-medium">{formatPEN(i.line_total)}</span>
                </div>
              ))}
              <div className="space-y-1 border-t border-dashed border-border pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPEN(o.subtotal)}</span></div>
                {Number(o.promotion_discount) > 0 && <div className="flex justify-between"><span className="text-muted">Promoción</span><span>− {formatPEN(o.promotion_discount)}</span></div>}
                {Number(o.coupon_discount) > 0 && <div className="flex justify-between"><span className="text-muted">Cupón</span><span>− {formatPEN(o.coupon_discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted">{o.fulfillment === "pickup" ? "Recojo" : "Delivery"}</span><span>{Number(o.delivery_fee) ? formatPEN(o.delivery_fee) : "Gratis"}</span></div>
                <div className="flex justify-between font-display text-lg font-bold"><span>Total</span><span>{formatPEN(o.total)}</span></div>
              </div>
              {o.notes && <p className="rounded-2xl bg-surface-2 p-3 text-sm">Notas del cliente: {o.notes}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cliente y entrega</CardTitle></CardHeader>
            <CardBody className="grid gap-4 text-sm md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="font-semibold">{o.customer_name || o.profiles?.full_name || "Sin nombre"}</p>
                {o.profiles?.id && <Link href={`/admin/clientes/${o.profiles.id}`} className="text-xs font-semibold text-brand hover:underline">Ver ficha del cliente</Link>}
                <p className="flex items-center gap-2 text-muted"><Mail className="h-4 w-4" /> {o.profiles?.email ?? "—"}</p>
                <p className="flex items-center gap-2 text-muted"><Phone className="h-4 w-4" /> {o.contact_phone ?? o.profiles?.phone ?? "—"}</p>
              </div>
              <div className="space-y-1.5">
                {o.fulfillment === "pickup" ? (
                  <p className="flex items-start gap-2"><Store className="mt-0.5 h-4 w-4 shrink-0" /> Recoge en tienda</p>
                ) : (
                  <>
                    <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {o.delivery_address}{o.delivery_district && `, ${o.delivery_district}`}</p>
                    {o.delivery_reference && <p className="text-xs text-muted">Referencia: {o.delivery_reference}</p>}
                  </>
                )}
                <p className="pt-1">Encargado de la entrega: <strong>{o.delivery_person_name ?? "Sin asignar"}</strong></p>
                {o.delivery_person_phone && <p className="text-muted">{o.delivery_person_phone}</p>}
              </div>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
            <CardBody>
              <OrderAdminControls order={o} payments={payments} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
            <CardBody>
              <StatusTimeline status={o.status} history={(history ?? []) as OrderStatusHistory[]} fulfillment={o.fulfillment} />
              {o.cancel_reason && <p className="mt-3 text-sm text-danger">Motivo: {o.cancel_reason}</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
