import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { RestaurantStatusActions } from "@/components/admin/restaurant-status-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type Tone } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { RESTAURANT_STATUS_LABEL } from "@/lib/constants";
import { formatPEN } from "@/lib/format";
import { sanitizeQuery } from "@/lib/services/catalog";
import type { Restaurant, RestaurantStatus } from "@/types";

export const metadata: Metadata = { title: "Restaurantes" };
const TONE: Record<RestaurantStatus, Tone> = { pending: "warning", approved: "success", suspended: "danger", rejected: "neutral" };

export default async function AdminRestaurantsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("restaurants").select("*, is_open").order("created_at", { ascending: false });
  if (sp.estado && sp.estado in RESTAURANT_STATUS_LABEL) query = query.eq("status", sp.estado as RestaurantStatus);
  const q = sp.q ? sanitizeQuery(sp.q) : "";
  if (q) query = query.or(`name.ilike.%${q}%,district.ilike.%${q}%`);
  const [{ data }, { data: sales }] = await Promise.all([query, supabase.rpc("admin_restaurant_sales")]);
  const restaurants = (data ?? []) as Restaurant[];
  const salesMap = new Map(((sales ?? []) as { restaurant_id: string; orders: number; sales: number; commission: number }[]).map((s) => [s.restaurant_id, s]));

  return (
    <div>
      <PageHeader
        title="Restaurantes"
        description="Registra, aprueba, suspende y configura comisiones de cada negocio."
        actions={<Link href="/admin/restaurantes/nuevo" className={buttonStyles()}><Plus className="h-4 w-4" /> Nuevo restaurante</Link>}
      />
      <FilterBar searchPlaceholder="Nombre o distrito" selects={[{ name: "estado", label: "Estado", options: Object.entries(RESTAURANT_STATUS_LABEL).map(([value, label]) => ({ value, label })) }]} />
      {restaurants.length === 0 ? <EmptyState title="No hay restaurantes" /> : (
        <TableWrap>
          <thead><tr><Th>Restaurante</Th><Th>Estado</Th><Th>Comisión</Th><Th>Pedidos</Th><Th>Ventas</Th><Th>Comisiones</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {restaurants.map((r) => {
              const s = salesMap.get(r.id);
              return (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/admin/restaurantes/${r.id}`} className="flex items-center gap-3">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface-2"><SmartImage src={r.logo_url} alt="" fill sizes="40px" className="object-cover" /></span>
                      <span>
                        <span className="block font-semibold hover:text-brand">{r.name} {r.is_demo && <Badge tone="accent" className="ml-1">Demo</Badge>}</span>
                        <span className="text-xs text-muted">{r.district} · {r.is_open ? "Abierto" : "Cerrado"}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td><Badge tone={TONE[r.status]}>{RESTAURANT_STATUS_LABEL[r.status]}</Badge></Td>
                  <Td>{(Number(r.commission_rate) * 100).toFixed(1)}%</Td>
                  <Td>{s?.orders ?? 0}</Td>
                  <Td className="font-medium">{formatPEN(s?.sales ?? 0)}</Td>
                  <Td>{formatPEN(s?.commission ?? 0)}</Td>
                  <Td><RestaurantStatusActions id={r.id} status={r.status} /></Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
