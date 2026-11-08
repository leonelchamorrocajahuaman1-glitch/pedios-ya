import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { CustomerStatusButton } from "@/components/admin/customer-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatPEN } from "@/lib/format";
import { sanitizeQuery } from "@/lib/services/store";
import type { AccountStatus, AppRole } from "@/types";

export const metadata: Metadata = { title: "Clientes" };
const PAGE_SIZE = 25;

interface CustomerRow {
  id: string; full_name: string; email: string | null; phone: string | null; status: AccountStatus; role: AppRole;
  created_at: string; address: string | null; orders: number; total_spent: number; total_count: number;
}

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();
  const q = sp.q ? sanitizeQuery(sp.q) : "";
  const { data, error } = await supabase.rpc("admin_customers", { p_search: q || null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });
  const rows = (data ?? []) as CustomerRow[];
  const total = rows[0]?.total_count ?? 0;
  return (
    <div>
      <PageHeader title="Clientes" description="Cuentas registradas, sus pedidos y compras. Las contraseñas nunca se muestran ni se almacenan aquí." />
      <FilterBar searchPlaceholder="Nombre, correo o teléfono" />
      {error && <p className="mb-4 text-sm text-danger">{error.message}</p>}
      {rows.length === 0 ? <EmptyState title="No hay clientes" /> : (
        <TableWrap>
          <thead><tr><Th>Cliente</Th><Th>Teléfono</Th><Th>Dirección</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Compras</Th><Th>Registro</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <Tr key={p.id}>
                <Td><Link href={`/admin/clientes/${p.id}`} className="font-semibold hover:text-brand">{p.full_name || "Sin nombre"}</Link><p className="text-xs text-muted">{p.email}</p></Td>
                <Td className="text-muted">{p.phone ?? "—"}</Td>
                <Td className="max-w-48 truncate text-muted">{p.address ?? "—"}</Td>
                <Td className="text-right">{p.orders}</Td>
                <Td className="text-right font-semibold">{formatPEN(p.total_spent)}</Td>
                <Td className="text-muted">{formatDate(p.created_at)}</Td>
                <Td>{p.role === "admin" ? <Badge tone="accent">Admin</Badge> : <Badge tone={p.status === "active" ? "success" : "danger"}>{p.status === "active" ? "Activo" : "Suspendido"}</Badge>}</Td>
                <Td className="text-right"><CustomerStatusButton profile={p} /></Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={Number(total)} baseHref={(n) => `/admin/clientes?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(n) })}`} />
    </div>
  );
}
