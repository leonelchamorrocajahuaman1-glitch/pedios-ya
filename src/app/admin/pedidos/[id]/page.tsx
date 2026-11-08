import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrderAdminControls } from "@/components/admin/order-admin-controls";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTimeline } from "@/components/tracking/status-timeline";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import type { Courier, Order, OrderStatusHistory, Payment } from "@/types";

export const metadata: Metadata = { title: "Detalle de pedido" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: history }, { data: couriers }] = await Promise.all([
    supabase.from("orders").select("*, restaurants(id, slug, name, phone, address), profiles(id, full_name, email, phone), couriers(id, full_name, phone, vehicle_type), order_items(*), payments(*)").eq("id", id).maybeSingle(),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
    supabase.from("couriers").select("id, full_name, is_available, vehicle_type").eq("status", "active").order("is_available", { ascending: false }),
  ]);
  if (!data) notFound();
  const o = data as Order;

  return (
    <div className="space-y-6">
      <LiveRefresh notifyInsert={false} />
      <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Pedidos</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{o.code}</h1>
        <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
        <Badge tone={PAYMENT_STATUS_TONE[o.payment_status]}>{PAYMENT_METHOD_LABEL[o.payment_method]} · {PAYMENT_STATUS_LABEL[o.payment_status]}</Badge>
        <span className="text-sm text-muted">{formatDateTime(o.created_at)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              {o.order_items?.map((i) => (
                <div key={i.id} className="flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{i.quantity}× {i.product_name} <span className="text-muted">({formatPEN(i.unit_price)})</span></p>
                    {i.options?.length > 0 && <p className="text-xs text-muted">{i.options.map((op) => `${op.group}: ${op.choice}${op.price ? ` (+${formatPEN(op.price)})` : ""}`).join(" · ")}</p>}
                    {i.notes && <p className="text-xs italic text-muted">“{i.notes}”</p>}
                  </div>
                  <span className="font-medium">{formatPEN(i.line_total)}</span>
                </div>
              ))}
              <div className="space-y-1 border-t border-dashed border-border pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPEN(o.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Envío {o.distance_km != null && `(${o.distance_km} km)`}</span><span>{formatPEN(o.delivery_fee)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Descuento</span><span>− {formatPEN(o.discount)}</span></div>
                <div className="flex justify-between font-display text-lg font-bold"><span>Total</span><span>{formatPEN(o.total)}</span></div>
                <div className="flex justify-between text-xs text-muted"><span>Comisión ({(Number(o.commission_rate) * 100).toFixed(1)}%)</span><span>{formatPEN(o.commission_amount)}</span></div>
              </div>
              {o.notes && <p className="rounded-2xl bg-surface-2 p-3 text-sm">Notas: {o.notes}</p>}
            </CardBody>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
              <CardBody className="space-y-1.5 text-sm">
                <Link href={`/admin/clientes/${o.profiles?.id}`} className="font-semibold text-brand hover:underline">{o.profiles?.full_name || "Sin nombre"}</Link>
                <p className="flex items-center gap-2 text-muted"><Mail className="h-4 w-4" /> {o.profiles?.email}</p>
                <p className="flex items-center gap-2 text-muted"><Phone className="h-4 w-4" /> {o.contact_phone ?? o.profiles?.phone ?? "—"}</p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {o.delivery_address}, {o.delivery_district}</p>
                {o.delivery_reference && <p className="text-xs text-muted">Ref.: {o.delivery_reference}</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Restaurante y reparto</CardTitle></CardHeader>
              <CardBody className="space-y-1.5 text-sm">
                <Link href={`/admin/restaurantes/${o.restaurants?.id}`} className="font-semibold text-brand hover:underline">{o.restaurants?.name}</Link>
                <p className="text-muted">{o.restaurants?.address}</p>
                <p className="text-muted">{o.restaurants?.phone}</p>
                <p className="pt-2">Repartidor: <strong>{o.couriers?.full_name ?? "Sin asignar"}</strong></p>
                {o.couriers?.phone && <p className="text-muted">{o.couriers.phone}</p>}
              </CardBody>
            </Card>
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
            <CardBody>
              <OrderAdminControls order={o} payments={(o.payments ?? []) as Payment[]} couriers={(couriers ?? []) as Pick<Courier, "id" | "full_name" | "is_available" | "vehicle_type">[]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
            <CardBody>
              <StatusTimeline status={o.status} history={(history ?? []) as OrderStatusHistory[]} />
              {o.cancel_reason && <p className="mt-3 text-sm text-danger">Motivo: {o.cancel_reason}</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
