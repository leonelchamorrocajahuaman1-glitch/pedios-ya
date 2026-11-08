import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportExport, type ReportSheet } from "@/components/admin/report-export";
import { ReportFilters } from "@/components/admin/report-filters";
import { StatCard } from "@/components/admin/stat-card";
import { TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { MOVEMENT_LABEL } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import type { MovementType } from "@/types";

export const metadata: Metadata = { title: "Reportes" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface SalesRow { period: string; period_start: string; orders: number; items: number; subtotal: number; discounts: number; delivery: number; revenue: number; cost: number; profit: number; cancelled: number }
interface ProductRow { product_id: string; name: string; sku: string | null; category: string | null; stock: number; qty: number; revenue: number; profit: number }

function limaToday() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = limaToday();
  const to = sp.hasta && DATE.test(sp.hasta) ? sp.hasta : today;
  const from = sp.desde && DATE.test(sp.desde) && sp.desde <= to ? sp.desde : `${to.slice(0, 8)}01`;
  const group = ["day", "week", "month"].includes(sp.agrupar ?? "") ? sp.agrupar! : "day";
  const supabase = await createSupabaseServerClient();

  const [sales, products, stock, moves, cancelled] = await Promise.all([
    supabase.rpc("admin_sales_report", { p_from: from, p_to: to, p_group: group }),
    supabase.rpc("admin_product_sales", { p_from: from, p_to: to }),
    supabase.from("products").select("id, name, sku, stock, min_stock, is_available").eq("catalog", "store").order("stock").limit(2000),
    supabase
      .from("inventory_movements")
      .select("id, type, quantity, stock_before, stock_after, reason, created_at, products(name, sku), profiles(full_name, email)")
      .gte("created_at", `${from}T00:00:00-05:00`).lte("created_at", `${to}T23:59:59.999-05:00`)
      .order("created_at", { ascending: false }).limit(500),
    supabase
      .from("orders")
      .select("id, code, customer_name, total, payment_method, cancel_reason, cancelled_at, created_at")
      .eq("catalog", "store").eq("status", "cancelled")
      .gte("created_at", `${from}T00:00:00-05:00`).lte("created_at", `${to}T23:59:59.999-05:00`)
      .order("created_at", { ascending: false }).limit(500),
  ]);
  const error = sales.error ?? products.error ?? stock.error ?? moves.error ?? cancelled.error;
  const rows = (sales.data ?? []) as SalesRow[];
  const prod = (products.data ?? []) as ProductRow[];
  const sold = prod.filter((p) => Number(p.qty) > 0);
  const low = ((stock.data ?? []) as { id: string; name: string; sku: string | null; stock: number; min_stock: number; is_available: boolean }[]).filter((p) => p.is_available && p.stock <= p.min_stock);
  const mv = (moves.data ?? []) as unknown as { id: number; type: MovementType; quantity: number; stock_before: number; stock_after: number; reason: string | null; created_at: string; products: { name: string; sku: string | null } | null; profiles: { full_name: string; email: string } | null }[];
  const canc = (cancelled.data ?? []) as { id: string; code: string; customer_name: string | null; total: number; payment_method: string; cancel_reason: string | null; created_at: string }[];

  const sum = (k: keyof SalesRow) => rows.reduce((a, r) => a + Number(r[k]), 0);
  const totals = { orders: sum("orders"), items: sum("items"), revenue: sum("revenue"), profit: sum("profit"), cancelled: sum("cancelled"), discounts: sum("discounts") };
  const subtitle = `Del ${from.split("-").reverse().join("/")} al ${to.split("-").reverse().join("/")} · ventas = pedidos entregados`;

  const sheets: ReportSheet[] = [
    {
      title: `Ventas (${group === "day" ? "diario" : group === "week" ? "semanal" : "mensual"})`,
      columns: [
        { header: "Periodo", key: "period", width: 24 }, { header: "Pedidos", key: "orders" }, { header: "Productos vendidos", key: "items", width: 18 },
        { header: "Subtotal", key: "subtotal", money: true }, { header: "Descuentos", key: "discounts", money: true }, { header: "Delivery", key: "delivery", money: true },
        { header: "Ingresos", key: "revenue", money: true }, { header: "Costo", key: "cost", money: true }, { header: "Ganancia bruta", key: "profit", money: true, width: 16 },
        { header: "Cancelados", key: "cancelled" },
      ],
      rows: rows as unknown as ReportSheet["rows"],
    },
    {
      title: "Productos vendidos",
      columns: [{ header: "Producto", key: "name", width: 40 }, { header: "SKU", key: "sku" }, { header: "Categoría", key: "category", width: 20 }, { header: "Unidades", key: "qty" }, { header: "Ingresos", key: "revenue", money: true }, { header: "Ganancia bruta", key: "profit", money: true, width: 16 }, { header: "Stock actual", key: "stock" }],
      rows: sold as unknown as ReportSheet["rows"],
    },
    {
      title: "Stock bajo y agotados",
      columns: [{ header: "Producto", key: "name", width: 40 }, { header: "SKU", key: "sku" }, { header: "Stock", key: "stock" }, { header: "Stock mínimo", key: "min_stock" }],
      rows: low as unknown as ReportSheet["rows"],
    },
    {
      title: "Movimientos de inventario",
      columns: [{ header: "Fecha", key: "date", width: 20 }, { header: "Producto", key: "product", width: 36 }, { header: "Tipo", key: "type", width: 18 }, { header: "Cambio", key: "quantity" }, { header: "Antes", key: "before" }, { header: "Después", key: "after" }, { header: "Motivo", key: "reason", width: 30 }, { header: "Responsable", key: "user", width: 24 }],
      rows: mv.map((m) => ({ date: formatDateTime(m.created_at), product: m.products?.name ?? "", type: MOVEMENT_LABEL[m.type], quantity: m.quantity, before: m.stock_before, after: m.stock_after, reason: m.reason, user: m.profiles?.full_name || m.profiles?.email || "" })),
    },
    {
      title: "Pedidos cancelados",
      columns: [{ header: "Pedido", key: "code" }, { header: "Fecha", key: "date", width: 20 }, { header: "Cliente", key: "customer_name", width: 28 }, { header: "Total", key: "total", money: true }, { header: "Motivo", key: "cancel_reason", width: 40 }],
      rows: canc.map((c) => ({ ...c, date: formatDateTime(c.created_at) })),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description={subtitle}
        actions={<ReportExport name={`reporte-huaytalla-${from}-a-${to}`} subtitle={subtitle} sheets={sheets} />}
      />
      <ReportFilters from={from} to={to} group={group} />
      {error && <p className="text-sm text-danger">{error.message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ingresos" value={formatPEN(totals.revenue)} hint={`Descuentos ${formatPEN(totals.discounts)}`} />
        <StatCard label="Ganancia bruta" value={formatPEN(totals.profit)} hint="Venta de productos − costo" />
        <StatCard label="Pedidos entregados" value={String(totals.orders)} />
        <StatCard label="Productos vendidos" value={String(totals.items)} hint={`${sold.length} productos distintos`} />
        <StatCard label="Pedidos cancelados" value={String(totals.cancelled)} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{sheets[0].title}</h2>
        <TableWrap>
          <thead><tr><Th>Periodo</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Productos</Th><Th className="text-right">Descuentos</Th><Th className="text-right">Delivery</Th><Th className="text-right">Ingresos</Th><Th className="text-right">Ganancia</Th><Th className="text-right">Cancelados</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <Tr><Td colSpan={8} className="py-8 text-center text-muted">Sin ventas en el periodo.</Td></Tr>}
            {rows.map((r) => (
              <Tr key={r.period_start}>
                <Td className="font-medium">{r.period}</Td>
                <Td className="text-right">{r.orders}</Td>
                <Td className="text-right">{r.items}</Td>
                <Td className="text-right text-muted">{formatPEN(r.discounts)}</Td>
                <Td className="text-right text-muted">{formatPEN(r.delivery)}</Td>
                <Td className="text-right font-semibold">{formatPEN(r.revenue)}</Td>
                <Td className="text-right">{formatPEN(r.profit)}</Td>
                <Td className="text-right">{r.cancelled}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Productos más vendidos</h2>
          <TableWrap>
            <thead><tr><Th>#</Th><Th>Producto</Th><Th className="text-right">Unidades</Th><Th className="text-right">Ingresos</Th><Th className="text-right">Stock</Th></tr></thead>
            <tbody>
              {sold.length === 0 && <Tr><Td colSpan={5} className="py-8 text-center text-muted">Sin ventas en el periodo.</Td></Tr>}
              {sold.slice(0, 20).map((p, i) => (
                <Tr key={p.product_id}>
                  <Td className="text-muted">{i + 1}</Td>
                  <Td><Link href={`/admin/productos/${p.product_id}`} className="font-medium hover:text-brand">{p.name}</Link><p className="text-xs text-muted">{p.category}</p></Td>
                  <Td className="text-right font-semibold">{p.qty}</Td>
                  <Td className="text-right">{formatPEN(p.revenue)}</Td>
                  <Td className="text-right">{p.stock}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
          {sold.length > 20 && <p className="mt-2 text-xs text-muted">Mostrando 20 de {sold.length}. La exportación incluye todos.</p>}
        </section>
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Stock bajo y agotados (actual)</h2>
          <div className="max-h-[520px] overflow-y-auto rounded-3xl border border-border bg-surface">
            {low.length === 0 ? <p className="p-6 text-center text-sm text-muted">Todo el inventario está sobre el mínimo.</p> : (
              <ul className="divide-y divide-border text-sm">
                {low.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <Link href={`/admin/productos/${p.id}`} className="truncate hover:text-brand">{p.name}</Link>
                    <Badge tone={p.stock === 0 ? "danger" : "accent"}>{p.stock === 0 ? "Agotado" : `${p.stock} / mín. ${p.min_stock}`}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Movimientos de inventario ({mv.length})</h2>
          <TableWrap>
            <thead><tr><Th>Fecha</Th><Th>Producto</Th><Th>Tipo</Th><Th className="text-right">Cambio</Th></tr></thead>
            <tbody>
              {mv.length === 0 && <Tr><Td colSpan={4} className="py-8 text-center text-muted">Sin movimientos.</Td></Tr>}
              {mv.slice(0, 15).map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(m.created_at)}</Td>
                  <Td className="text-sm">{m.products?.name}</Td>
                  <Td><Badge>{MOVEMENT_LABEL[m.type]}</Badge></Td>
                  <Td className={`text-right font-semibold ${m.quantity > 0 ? "text-success" : "text-danger"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
          <Link href={`/admin/inventario?desde=${from}&hasta=${to}`} className="mt-2 inline-block text-sm font-semibold text-brand">Ver historial completo</Link>
        </section>
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Pedidos cancelados ({canc.length})</h2>
          <TableWrap>
            <thead><tr><Th>Pedido</Th><Th>Cliente</Th><Th>Motivo</Th><Th className="text-right">Total</Th></tr></thead>
            <tbody>
              {canc.length === 0 && <Tr><Td colSpan={4} className="py-8 text-center text-muted">Sin cancelaciones.</Td></Tr>}
              {canc.slice(0, 15).map((c) => (
                <Tr key={c.id}>
                  <Td><Link href={`/admin/pedidos/${c.id}`} className="font-mono text-sm font-semibold text-brand">{c.code}</Link><p className="text-xs text-muted">{formatDateTime(c.created_at)}</p></Td>
                  <Td className="text-sm">{c.customer_name}</Td>
                  <Td className="max-w-48 truncate text-sm text-muted">{c.cancel_reason ?? "—"}</Td>
                  <Td className="text-right">{formatPEN(c.total)}</Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </section>
      </div>
    </div>
  );
}
