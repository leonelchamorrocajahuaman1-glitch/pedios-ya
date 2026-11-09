import Link from "next/link";
import { AlertCircle, AlertTriangle, Ban, Boxes, CalendarDays, CheckCircle2, ClipboardList, Clock, PackageCheck, PackageX, TrendingUp, Truck, Users, Wallet } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { SalesChart, type SeriesPoint } from "@/components/admin/sales-chart";
import { RankingChart, RevenueChart, type MonthPoint, type RankItem } from "@/components/admin/charts";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatPEN, formatRelative } from "@/lib/format";
import type { Order } from "@/types";

interface Stats {
  sales_today: number; sales_yesterday: number; sales_week: number; sales_month: number; revenue_total: number; gross_profit_total: number;
  orders_today: number; orders_pending: number; orders_confirmed: number; orders_preparing: number; orders_ready: number; orders_on_the_way: number;
  orders_delivered: number; orders_cancelled: number; avg_ticket: number;
  products_available: number; products_out_of_stock: number; products_low_stock: number; products_inactive: number;
  customers: number; payments_to_verify: number;
  daily: SeriesPoint[]; weekly: SeriesPoint[]; monthly: (SeriesPoint & MonthPoint)[];
  top_products: RankItem[]; top_categories: RankItem[];
}

function delta(today: number, yesterday: number) {
  if (!yesterday) return today ? "Ayer: S/ 0.00" : "Sin ventas ayer";
  const pct = ((today - yesterday) / yesterday) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs ayer (${formatPEN(yesterday)})`;
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: recent }] = await Promise.all([
    supabase.rpc("admin_store_dashboard"),
    supabase
      .from("orders")
      .select("id, code, is_test, status, total, payment_method, fulfillment, customer_name, created_at")
      .eq("catalog", "store")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  if (error || !data) return <p className="text-danger">No se pudieron cargar las estadísticas: {error?.message}</p>;
  const s = data as Stats;
  const pipeline = [
    { label: ORDER_STATUS_LABEL.received, value: s.orders_pending, href: "received", icon: <Clock /> },
    { label: ORDER_STATUS_LABEL.accepted, value: s.orders_confirmed, href: "accepted", icon: <CheckCircle2 /> },
    { label: ORDER_STATUS_LABEL.preparing, value: s.orders_preparing, href: "preparing", icon: <Boxes /> },
    { label: ORDER_STATUS_LABEL.ready, value: s.orders_ready, href: "ready", icon: <PackageCheck /> },
    { label: ORDER_STATUS_LABEL.on_the_way, value: s.orders_on_the_way, href: "on_the_way", icon: <Truck /> },
    { label: ORDER_STATUS_LABEL.delivered, value: s.orders_delivered, href: "delivered", icon: <CheckCircle2 /> },
  ];

  return (
    <div className="space-y-6">
      <LiveRefresh />
      <PageHeader title="Dashboard" description="Resumen del minimarket con datos reales, actualizado en tiempo real." />

      {(s.payments_to_verify > 0 || s.products_out_of_stock > 0 || s.products_low_stock > 0) && (
        <div className="flex flex-wrap gap-3">
          {s.payments_to_verify > 0 && (
            <Link href="/admin/pedidos?pago=pending_verification" className="flex items-center gap-2 rounded-2xl bg-warning/12 px-4 py-3 text-sm font-semibold text-warning">
              <AlertCircle className="h-4 w-4" /> {s.payments_to_verify} pago(s) Yape/Plin por verificar
            </Link>
          )}
          {s.products_out_of_stock > 0 && (
            <Link href="/admin/inventario?alerta=agotado" className="flex items-center gap-2 rounded-2xl bg-danger/12 px-4 py-3 text-sm font-semibold text-danger">
              <PackageX className="h-4 w-4" /> {s.products_out_of_stock} producto(s) agotado(s)
            </Link>
          )}
          {s.products_low_stock > 0 && (
            <Link href="/admin/inventario?alerta=bajo" className="flex items-center gap-2 rounded-2xl bg-accent/12 px-4 py-3 text-sm font-semibold text-accent">
              <AlertTriangle className="h-4 w-4" /> {s.products_low_stock} con stock bajo
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas de hoy" value={formatPEN(s.sales_today)} hint={delta(Number(s.sales_today), Number(s.sales_yesterday))} icon={<TrendingUp />} />
        <StatCard label="Ventas de la semana" value={formatPEN(s.sales_week)} hint="Desde el lunes" icon={<CalendarDays />} />
        <StatCard label="Ventas del mes" value={formatPEN(s.sales_month)} hint={`Ticket promedio ${formatPEN(s.avg_ticket)}`} icon={<CalendarDays />} />
        <StatCard label="Ingresos totales" value={formatPEN(s.revenue_total)} hint={`Ganancia bruta estimada ${formatPEN(s.gross_profit_total)}`} icon={<Wallet />} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Pedidos por estado</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {pipeline.map((p) => (
            <Link key={p.href} href={`/admin/pedidos?estado=${p.href}`} className="rounded-3xl border border-border bg-surface p-4 transition hover:border-brand/50">
              <span className="flex items-center gap-2 text-xs text-muted [&_svg]:h-4 [&_svg]:w-4">{p.icon} {p.label}</span>
              <span className="mt-1 block font-display text-2xl font-bold">{p.value}</span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Hoy: {s.orders_today} pedido(s) · Cancelados en total: {s.orders_cancelled}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Productos disponibles" value={String(s.products_available)} icon={<PackageCheck />} />
        <StatCard label="Agotados" value={String(s.products_out_of_stock)} icon={<PackageX />} />
        <StatCard label="Stock bajo" value={String(s.products_low_stock)} hint="Igual o menor al mínimo" icon={<AlertTriangle />} />
        <StatCard label="Desactivados" value={String(s.products_inactive)} icon={<Ban />} />
        <StatCard label="Clientes registrados" value={String(s.customers)} icon={<Users />} />
      </div>

      <SalesChart data={{ daily: s.daily, weekly: s.weekly, monthly: s.monthly }} />
      <RevenueChart data={s.monthly} />
      <div className="grid gap-6 xl:grid-cols-2">
        <RankingChart title="Productos más vendidos" data={s.top_products} metric="qty" />
        <RankingChart title="Categorías más vendidas" data={s.top_categories} metric="revenue" />
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Pedidos recientes</h2>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-brand hover:underline">Ver todos</Link>
        </div>
        {!recent?.length ? (
          <p className="py-8 text-center text-sm text-muted"><ClipboardList className="mx-auto mb-2 h-6 w-6" /> Aún no hay pedidos.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(recent as unknown as Order[]).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 py-3 text-sm hover:opacity-80">
                  <span className="font-mono font-semibold">{o.code}</span>
                  {o.is_test && <Badge tone="warning">PRUEBA</Badge>}
                  <span className="min-w-0 flex-1 truncate text-muted">{o.customer_name} · {o.fulfillment === "pickup" ? "Recojo" : "Delivery"} · {PAYMENT_METHOD_LABEL[o.payment_method]}</span>
                  <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  <span className="hidden w-20 text-right font-semibold sm:block">{formatPEN(o.total)}</span>
                  <span className="hidden w-24 text-right text-xs text-muted md:block">{formatRelative(o.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
