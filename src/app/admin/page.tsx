import Link from "next/link";
import { AlertCircle, Banknote, Bike, CheckCircle2, ClipboardList, Clock, Coins, Store, TrendingUp, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { SalesChart, type SeriesPoint } from "@/components/admin/sales-chart";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatPEN, formatRelative } from "@/lib/format";
import type { Order, PaymentMethod } from "@/types";

interface Stats {
  total_sales: number; orders_total: number; orders_pending: number; orders_completed: number; orders_cancelled: number;
  commissions: number; delivery_fees: number; revenue: number; avg_ticket: number; customers: number; restaurants: number;
  restaurants_pending: number; couriers_active: number; payments_to_verify: number;
  daily: SeriesPoint[]; weekly: SeriesPoint[]; monthly: SeriesPoint[];
  by_payment: { method: PaymentMethod; orders: number; sales: number }[];
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: recent }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("orders").select("id, code, status, total, payment_method, created_at, restaurants(name), profiles(full_name)").order("created_at", { ascending: false }).limit(8),
  ]);
  if (error || !data) return <p className="text-danger">No se pudieron cargar las estadísticas: {error?.message}</p>;
  const s = data as Stats;
  const maxPay = Math.max(1, ...s.by_payment.map((p) => Number(p.sales)));

  return (
    <div className="space-y-6">
      <LiveRefresh />
      <PageHeader title="Dashboard" description="Resumen de la operación en tiempo real." />

      {(s.payments_to_verify > 0 || s.restaurants_pending > 0) && (
        <div className="flex flex-wrap gap-3">
          {s.payments_to_verify > 0 && (
            <Link href="/admin/pedidos?pago=pending_verification" className="flex items-center gap-2 rounded-2xl bg-warning/12 px-4 py-3 text-sm font-semibold text-warning">
              <AlertCircle className="h-4 w-4" /> {s.payments_to_verify} pago(s) Yape/Plin por verificar
            </Link>
          )}
          {s.restaurants_pending > 0 && (
            <Link href="/admin/restaurantes?estado=pending" className="flex items-center gap-2 rounded-2xl bg-info/12 px-4 py-3 text-sm font-semibold text-info">
              <Store className="h-4 w-4" /> {s.restaurants_pending} solicitud(es) de negocio por aprobar
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas totales" value={formatPEN(s.total_sales)} hint={`Ticket promedio ${formatPEN(s.avg_ticket)}`} icon={<TrendingUp />} />
        <StatCard label="Ingresos de la plataforma" value={formatPEN(s.revenue)} hint="Comisiones + tarifa de servicio" icon={<Coins />} />
        <StatCard label="Comisiones" value={formatPEN(s.commissions)} hint={`Envíos cobrados ${formatPEN(s.delivery_fees)}`} icon={<Banknote />} />
        <StatCard label="Pedidos realizados" value={String(s.orders_total)} hint={`${s.orders_cancelled} cancelados`} icon={<ClipboardList />} />
        <StatCard label="Pedidos pendientes" value={String(s.orders_pending)} hint="En curso ahora" icon={<Clock />} />
        <StatCard label="Pedidos completados" value={String(s.orders_completed)} icon={<CheckCircle2 />} />
        <StatCard label="Clientes registrados" value={String(s.customers)} icon={<Users />} />
        <StatCard label="Restaurantes activos" value={String(s.restaurants)} hint={`${s.couriers_active} repartidores activos`} icon={<Bike />} />
      </div>

      <SalesChart data={{ daily: s.daily, weekly: s.weekly, monthly: s.monthly }} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-sm font-semibold text-brand hover:underline">Ver todos</Link>
          </div>
          {!recent?.length ? <p className="py-8 text-center text-sm text-muted">Aún no hay pedidos.</p> : (
            <ul className="divide-y divide-border">
              {(recent as unknown as Order[]).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 py-3 text-sm hover:opacity-80">
                    <span className="font-mono font-semibold">{o.code}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{o.restaurants?.name} · {o.profiles?.full_name}</span>
                    <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    <span className="hidden w-20 text-right font-semibold sm:block">{formatPEN(o.total)}</span>
                    <span className="hidden w-24 text-right text-xs text-muted md:block">{formatRelative(o.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Ventas por método de pago</h2>
          {s.by_payment.length === 0 ? <p className="py-8 text-center text-sm text-muted">Sin datos todavía.</p> : (
            <ul className="space-y-4">
              {s.by_payment.map((p) => (
                <li key={p.method} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{PAYMENT_METHOD_LABEL[p.method]}</span>
                    <span className="text-muted">{formatPEN(p.sales)} · {p.orders} pedidos</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(Number(p.sales) / maxPay) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
