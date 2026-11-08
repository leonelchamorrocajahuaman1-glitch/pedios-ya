import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Pagination, TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Auditoría" };
const PAGE_SIZE = 40;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createSupabaseServerClient();
  const { data, count } = await supabase
    .from("admin_audit_logs")
    .select("id, action, entity, entity_id, details, created_at, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as { id: number; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string; profiles: { full_name: string; email: string } | null }[];
  return (
    <div>
      <PageHeader title="Auditoría" description="Registro inalterable de operaciones administrativas importantes." />
      {rows.length === 0 ? <EmptyState title="Sin registros todavía" /> : (
        <TableWrap>
          <thead><tr><Th>Fecha</Th><Th>Usuario</Th><Th>Acción</Th><Th>Entidad</Th><Th>Detalle</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</Td>
                <Td>{r.profiles?.full_name || r.profiles?.email || "Sistema"}</Td>
                <Td><Badge tone="accent">{r.action}</Badge></Td>
                <Td className="font-mono text-xs">{r.entity}{r.entity_id && ` · ${r.entity_id.slice(0, 8)}`}</Td>
                <Td><details><summary className="cursor-pointer text-xs text-brand">Ver</summary><pre className="mt-2 max-h-48 max-w-md overflow-auto rounded-xl bg-surface-2 p-2 text-[11px]">{JSON.stringify(r.details, null, 2)}</pre></details></Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref={(n) => `/admin/auditoria?page=${n}`} />
    </div>
  );
}
