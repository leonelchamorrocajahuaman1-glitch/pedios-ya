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
import { sanitizeQuery } from "@/lib/services/catalog";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

export const metadata: Metadata = { title: "Pedidos" };
const PAGE_SIZE = 20;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("orders")
    .select("id, code, status, total, payment_method, payment_status, created_at, delivery_district, restaurants(name), profiles(full_name, email), couriers(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.estado && sp.estado in ORDER_STATUS_LABEL) query = query.eq("status", sp.estado as OrderStatus);
  if (sp.pago && sp.pago in PAYMENT_STATUS_LABEL) query = query.eq("payment_status", sp.pago as PaymentStatus);
  if (sp.metodo && sp.metodo in PAYMENT_METHOD_LABEL) query = query.eq("payment_method", sp.metodo);
  const q = sp.q ? sanitizeQuery(sp.q) : "";
  if (q) query = query.or(`code.ilike.%${q}%,delivery_address.ilike.%${q}%,delivery_district.ilike.%${q}%,contact_phone.ilike.%${q}%`);

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
      <PageHeader title="Pedidos" description="Todos los pedidos de la plataforma, actualizados en tiempo real." />
      <FilterBar
        searchPlaceholder="Código, dirección, distrito o teléfono"
        selects={[
          { name: "estado", label: "Estado", options: Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "pago", label: "Pago", options: Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "metodo", label: "Método", options: Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label })) },
        ]}
      />
      {error && <p className="mb-4 text-sm text-danger">{error.message}</p>}
      {orders.length === 0 ? (
        <EmptyState title="No hay pedidos con esos filtros" />
      ) : (
        <TableWrap>
          <thead><tr><Th>Pedido</Th><Th>Cliente</Th><Th>Restaurante</Th><Th>Repartidor</Th><Th>Estado</Th><Th>Pago</Th><Th className="text-right">Total</Th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold text-brand hover:underline">{o.code}</Link>
                  <p className="text-xs text-muted">{formatDateTime(o.created_at)}</p>
                </Td>
                <Td><p className="font-medium">{o.profiles?.full_name || "—"}</p><p className="text-xs text-muted">{o.profiles?.email}</p></Td>
                <Td>{o.restaurants?.name}<p className="text-xs text-muted">{o.delivery_district}</p></Td>
                <Td className="text-muted">{o.couriers?.full_name ?? "Sin asignar"}</Td>
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
