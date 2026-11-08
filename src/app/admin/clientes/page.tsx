import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { CustomerStatusButton } from "@/components/admin/customer-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { sanitizeQuery } from "@/lib/services/catalog";
import type { Profile } from "@/types";

export const metadata: Metadata = { title: "Clientes" };
const PAGE_SIZE = 25;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("profiles").select("*, orders(count)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.estado === "active" || sp.estado === "suspended") query = query.eq("status", sp.estado);
  const q = sp.q ? sanitizeQuery(sp.q) : "";
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, count } = await query;
  const rows = (data ?? []) as (Profile & { orders: { count: number }[] })[];
  return (
    <div>
      <PageHeader title="Clientes" description="Cuentas registradas, pedidos y estado de acceso." />
      <FilterBar searchPlaceholder="Nombre, correo o teléfono" selects={[{ name: "estado", label: "Estado", options: [{ value: "active", label: "Activos" }, { value: "suspended", label: "Suspendidos" }] }]} />
      {rows.length === 0 ? <EmptyState title="No hay clientes" /> : (
        <TableWrap>
          <thead><tr><Th>Cliente</Th><Th>Teléfono</Th><Th>Pedidos</Th><Th>Registro</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <Tr key={p.id}>
                <Td><Link href={`/admin/clientes/${p.id}`} className="font-semibold hover:text-brand">{p.full_name || "Sin nombre"}</Link><p className="text-xs text-muted">{p.email}</p></Td>
                <Td className="text-muted">{p.phone ?? "—"}</Td>
                <Td>{p.orders?.[0]?.count ?? 0}</Td>
                <Td className="text-muted">{formatDate(p.created_at)}</Td>
                <Td>{p.role === "admin" ? <Badge tone="accent">Admin</Badge> : <Badge tone={p.status === "active" ? "success" : "danger"}>{p.status === "active" ? "Activo" : "Suspendido"}</Badge>}</Td>
                <Td className="text-right"><CustomerStatusButton profile={p} /></Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref={(n) => `/admin/clientes?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.estado ? { estado: sp.estado } : {}), page: String(n) })}`} />
    </div>
  );
}
