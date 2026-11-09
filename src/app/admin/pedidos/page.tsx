import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { Pagination, TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

export const metadata: Metadata = { title: "Pedidos" };
const PAGE_SIZE = 20;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("orders")
    .select("id, code, is_test, status, total, fulfillment, payment_method, payment_status, created_at, customer_name, contact_phone, delivery_district, delivery_person_name, profiles(full_name, email)", { count: "exact" })
    .eq("catalog", "store")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.estado && sp.estado in ORDER_STATUS_LABEL) query = query.eq("status", sp.estado as OrderStatus);
  if (sp.pago && sp.pago in PAYMENT_STATUS_LABEL) query = query.eq("payment_status", sp.pago as PaymentStatus);
  if (sp.metodo && ["cash", "yape", "plin"].includes(sp.metodo)) query = query.eq("payment_method", sp.metodo);
  if (sp.modalidad === "delivery" || sp.modalidad === "pickup") query = query.eq("fulfillment", sp.modalidad);
  // Fechas en hora de Lima (UTC-5, sin horario de verano)
  if (sp.desde && DATE.test(sp.desde)) query = query.gte("created_at", `${sp.desde}T00:00:00-05:00`);
  if (sp.hasta && DATE.test(sp.hasta)) query = query.lte("created_at", `${sp.hasta}T23:59:59.999-05:00`);
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N} -]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (q) query = query.or(`code.ilike.%${q}%,customer_name.ilike.%${q}%,contact_phone.ilike.%${q}%,delivery_address.ilike.%${q}%`);

  const { data, count, error } = await query;
  const orders = (data ?? []) as unknown as Order[];
  const href = (p: number) => {
    const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    n.set("page", String(p));
    return `/admin/pedidos?${n}`;
  };

  return (
    <div>
      <LiveRefresh />
      <PageHeader title="Pedidos" description="Pedidos de la tienda, actualizados en tiempo real." />
      <FilterBar
        searchPlaceholder="N° de pedido, cliente, teléfono o dirección"
        dates
        selects={[
          { name: "estado", label: "Estado", options: Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "pago", label: "Pago", options: Object.entries(PAYMENT_STATUS_LABEL).filter(([v]) => v !== "refunded").map(([value, label]) => ({ value, label })) },
          { name: "metodo", label: "Método", options: (["cash", "yape", "plin"] as const).map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] })) },
          { name: "modalidad", label: "Modalidad", allLabel: "Delivery y recojo", options: [{ value: "delivery", label: "Delivery" }, { value: "pickup", label: "Recojo en tienda" }] },
        ]}
      />
      {error && <p className="mb-4 text-sm text-danger">{error.message}</p>}
      {orders.length === 0 ? (
        <EmptyState title="No hay pedidos con esos filtros" />
      ) : (
        <TableWrap>
          <thead><tr><Th>Pedido</Th><Th>Cliente</Th><Th>Entrega</Th><Th>Estado</Th><Th>Pago</Th><Th className="text-right">Total</Th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold text-brand hover:underline">{o.code}</Link>{o.is_test && <Badge tone="warning" className="ml-2">PRUEBA</Badge>}
                  <p className="text-xs text-muted">{formatDateTime(o.created_at)}</p>
                </Td>
                <Td><p className="font-medium">{o.customer_name || o.profiles?.full_name || "—"}</p><p className="text-xs text-muted">{o.contact_phone || o.profiles?.email}</p></Td>
                <Td>
                  {o.fulfillment === "pickup" ? "Recojo en tienda" : <>Delivery<p className="text-xs text-muted">{o.delivery_district}</p></>}
                  {o.delivery_person_name && <p className="text-xs text-muted">Entrega: {o.delivery_person_name}</p>}
                </Td>
                <Td><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></Td>
                <Td><Badge tone={PAYMENT_STATUS_TONE[o.payment_status]}>{PAYMENT_METHOD_LABEL[o.payment_method]} · {PAYMENT_STATUS_LABEL[o.payment_status]}</Badge></Td>
                <Td className="text-right font-semibold">{formatPEN(o.total)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref={href} />
    </div>
  );
}
