import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { InventoryMoveForm } from "@/components/admin/inventory-move-form";
import { Pagination, TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MOVEMENT_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { InventoryMovement, MovementType } from "@/types";

export const metadata: Metadata = { title: "Inventario" };
const PAGE_SIZE = 30;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TONE: Record<MovementType, "success" | "danger" | "info" | "brand" | "warning"> = { in: "success", out: "danger", adjustment: "info", sale: "brand", sale_cancel: "warning" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();

  let mq = supabase
    .from("inventory_movements")
    .select("id, product_id, type, quantity, stock_before, stock_after, reason, order_id, created_at, products(id, name, sku), profiles(full_name, email), orders(code)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.producto && /^[0-9a-f-]{36}$/.test(sp.producto)) mq = mq.eq("product_id", sp.producto);
  if (sp.tipo && sp.tipo in MOVEMENT_LABEL) mq = mq.eq("type", sp.tipo);
  if (sp.desde && DATE.test(sp.desde)) mq = mq.gte("created_at", `${sp.desde}T00:00:00-05:00`);
  if (sp.hasta && DATE.test(sp.hasta)) mq = mq.lte("created_at", `${sp.hasta}T23:59:59.999-05:00`);

  const [{ data: products }, { data: moves, count, error }] = await Promise.all([
    supabase.from("products").select("id, name, sku, stock, min_stock, is_available").eq("catalog", "store").order("name").limit(2000),
    mq,
  ]);
  const all = (products ?? []) as { id: string; name: string; sku: string | null; stock: number; min_stock: number; is_available: boolean }[];
  const out = all.filter((p) => p.is_available && p.stock === 0);
  const low = all.filter((p) => p.is_available && p.stock > 0 && p.stock <= p.min_stock).sort((a, b) => a.stock - b.stock);
  const rows = (moves ?? []) as unknown as (InventoryMovement & { orders: { code: string } | null })[];
  const href = (p: number) => {
    const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    n.set("page", String(p));
    return `/admin/inventario?${n}`;
  };
  const alert = sp.alerta === "agotado" ? out : sp.alerta === "bajo" ? low : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" description="Entradas, salidas y ajustes con motivo, fecha y usuario responsable. Las ventas descuentan stock automáticamente." />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PackageX className="h-5 w-5 text-danger" /> Agotados ({out.length})</CardTitle></CardHeader>
              <CardBody>
                {out.length === 0 ? <p className="text-sm text-muted">Ningún producto activo agotado.</p> : (
                  <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm">
                    {(alert === out ? out : out.slice(0, 8)).map((p) => (
                      <li key={p.id} className="flex justify-between gap-2"><Link href={`/admin/inventario?producto=${p.id}`} className="truncate hover:text-brand">{p.name}</Link><Badge tone="danger">0</Badge></li>
                    ))}
                    {alert !== out && out.length > 8 && <li><Link href="/admin/inventario?alerta=agotado" className="text-xs font-semibold text-brand">Ver los {out.length}</Link></li>}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-accent" /> Stock bajo ({low.length})</CardTitle></CardHeader>
              <CardBody>
                {low.length === 0 ? <p className="text-sm text-muted">Todo por encima del stock mínimo.</p> : (
                  <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm">
                    {(alert === low ? low : low.slice(0, 8)).map((p) => (
                      <li key={p.id} className="flex justify-between gap-2"><Link href={`/admin/inventario?producto=${p.id}`} className="truncate hover:text-brand">{p.name}</Link><Badge tone="accent">{p.stock} / mín. {p.min_stock}</Badge></li>
                    ))}
                    {alert !== low && low.length > 8 && <li><Link href="/admin/inventario?alerta=bajo" className="text-xs font-semibold text-brand">Ver los {low.length}</Link></li>}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-semibold">Historial de movimientos</h2>
            <FilterBar
              dates
              selects={[
                { name: "producto", label: "Producto", allLabel: "Todos los productos", options: all.map((p) => ({ value: p.id, label: p.name })) },
                { name: "tipo", label: "Tipo", allLabel: "Todos los tipos", options: Object.entries(MOVEMENT_LABEL).map(([value, label]) => ({ value, label })) },
              ]}
              hideSearch
            />
            {error && <p className="mb-4 text-sm text-danger">{error.message}</p>}
            {rows.length === 0 ? <EmptyState title="Sin movimientos con esos filtros" /> : (
              <TableWrap>
                <thead><tr><Th>Fecha</Th><Th>Producto</Th><Th>Tipo</Th><Th className="text-right">Cambio</Th><Th className="text-right">Stock</Th><Th>Motivo</Th><Th>Responsable</Th></tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <Tr key={m.id}>
                      <Td className="whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</Td>
                      <Td><Link href={`/admin/productos/${m.product_id}`} className="font-medium hover:text-brand">{m.products?.name ?? "—"}</Link><p className="text-xs text-muted">{m.products?.sku}</p></Td>
                      <Td><Badge tone={TONE[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge></Td>
                      <Td className={`text-right font-semibold ${m.quantity > 0 ? "text-success" : "text-danger"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td>
                      <Td className="whitespace-nowrap text-right text-muted">{m.stock_before} → <span className="font-semibold text-fg">{m.stock_after}</span></Td>
                      <Td className="max-w-56 text-sm">
                        {m.reason ?? "—"}
                        {m.order_id && m.orders?.code && <p><Link href={`/admin/pedidos/${m.order_id}`} className="font-mono text-xs text-brand">{m.orders.code}</Link></p>}
                      </Td>
                      <Td className="text-sm text-muted">{m.profiles?.full_name || m.profiles?.email || (m.type === "sale" ? "Cliente (compra)" : "Sistema")}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref={href} />
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Card>
            <CardHeader><CardTitle>Registrar movimiento</CardTitle></CardHeader>
            <CardBody><InventoryMoveForm products={all} defaultProduct={sp.producto} /></CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
