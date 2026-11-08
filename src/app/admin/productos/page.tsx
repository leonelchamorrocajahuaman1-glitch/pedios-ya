import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SmartImage } from "@/components/ui/smart-image";
import { buttonStyles } from "@/components/ui/button";
import { formatPEN } from "@/lib/format";
import { sanitizeQuery } from "@/lib/services/store";
import type { Category, Product } from "@/types";

export const metadata: Metadata = { title: "Productos" };
const PAGE_SIZE = 25;
const SORTS: Record<string, { col: string; asc: boolean; label: string }> = {
  recientes: { col: "created_at", asc: false, label: "Más recientes" },
  nombre: { col: "name", asc: true, label: "Nombre (A-Z)" },
  precio_asc: { col: "price", asc: true, label: "Precio: menor a mayor" },
  precio_desc: { col: "price", asc: false, label: "Precio: mayor a menor" },
  stock_asc: { col: "stock", asc: true, label: "Stock: menor a mayor" },
  stock_desc: { col: "stock", asc: false, label: "Stock: mayor a menor" },
};

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = SORTS[sp.orden ?? ""] ?? SORTS.recientes;
  const supabase = await createSupabaseServerClient();
  const { data: cats } = await supabase.from("categories").select("id, name, parent_id, sort_order").eq("catalog", "store").order("sort_order").order("name");
  const categories = (cats ?? []) as Pick<Category, "id" | "name" | "parent_id">[];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const lowOnly = sp.estado === "bajo";
  let query = supabase
    .from("products")
    .select("id, name, slug, sku, brand, image_url, price, compare_at_price, cost_price, final_price, discount_percent, stock, min_stock, unit, weight, is_available, is_featured, is_demo, category_id, subcategory_id", { count: "exact" })
    .eq("catalog", "store")
    .order(sort.col, { ascending: sort.asc })
    .order("name");
  if (!lowOnly) query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.categoria && /^[0-9a-f-]{36}$/.test(sp.categoria)) query = query.or(`category_id.eq.${sp.categoria},subcategory_id.eq.${sp.categoria}`);
  if (sp.estado === "activo") query = query.eq("is_available", true);
  if (sp.estado === "inactivo") query = query.eq("is_available", false);
  if (sp.estado === "agotado") query = query.eq("stock", 0);
  if (sp.estado === "oferta") query = query.not("compare_at_price", "is", null);
  if (sp.estado === "destacado") query = query.eq("is_featured", true);
  if (sp.estado === "demo") query = query.eq("is_demo", true);
  if (lowOnly) query = query.gt("stock", 0);
  const q = sp.q ? sanitizeQuery(sp.q) : "";
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`);

  const { data, count, error } = await query;
  let products = (data ?? []) as unknown as Product[];
  // stock <= stock mínimo compara dos columnas: se filtra aquí (catálogo de un minimarket, volumen acotado)
  if (lowOnly) products = products.filter((p) => p.stock <= p.min_stock);
  const href = (p: number) => {
    const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    n.set("page", String(p));
    return `/admin/productos?${n}`;
  };

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo completo de la tienda. El stock se modifica desde Inventario para que cada cambio quede registrado."
        actions={<Link href="/admin/productos/nuevo" className={buttonStyles()}><Plus className="h-4 w-4" /> Nuevo producto</Link>}
      />
      <FilterBar
        searchPlaceholder="Nombre, SKU, código de barras o marca"
        selects={[
          { name: "categoria", label: "Categoría", allLabel: "Todas las categorías", options: categories.map((c) => ({ value: c.id, label: c.parent_id ? `↳ ${c.name}` : c.name })) },
          {
            name: "estado", label: "Estado", allLabel: "Todos los estados",
            options: [
              { value: "activo", label: "Activos" }, { value: "inactivo", label: "Desactivados" }, { value: "agotado", label: "Agotados" },
              { value: "bajo", label: "Stock bajo" }, { value: "oferta", label: "En oferta" }, { value: "destacado", label: "Destacados" }, { value: "demo", label: "Demostración" },
            ],
          },
          { name: "orden", label: "Orden", allLabel: "Más recientes", options: Object.entries(SORTS).filter(([k]) => k !== "recientes").map(([value, s]) => ({ value, label: s.label })) },
        ]}
      />
      {error && <p className="mb-4 text-sm text-danger">{error.message}</p>}
      {products.length === 0 ? (
        <EmptyState title="No hay productos con esos filtros" description="Cambia los filtros o crea un producto nuevo." />
      ) : (
        <TableWrap>
          <thead><tr><Th>Producto</Th><Th>Categoría</Th><Th className="text-right">Precio</Th><Th className="text-right">Stock</Th><Th>Estado</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {products.map((p) => {
              const low = p.stock > 0 && p.stock <= p.min_stock;
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2"><SmartImage src={p.image_url} alt="" fill sizes="48px" className="object-cover" /></span>
                      <span className="min-w-0">
                        <Link href={`/admin/productos/${p.id}`} className="block truncate font-semibold hover:text-brand">{p.name}</Link>
                        <span className="text-xs text-muted">{[p.brand, p.sku, p.weight ? `${p.weight} ${p.unit}` : p.unit].filter(Boolean).join(" · ")}</span>
                      </span>
                    </div>
                  </Td>
                  <Td className="text-muted">{catName.get(p.category_id ?? "") ?? "—"}{p.subcategory_id && <p className="text-xs">↳ {catName.get(p.subcategory_id)}</p>}</Td>
                  <Td className="text-right">
                    <p className="font-semibold">{formatPEN(p.final_price)}</p>
                    {Number(p.final_price) < Number(p.price) && <p className="text-xs text-muted line-through">{formatPEN(p.price)}</p>}
                    {p.compare_at_price && Number(p.final_price) === Number(p.price) && <p className="text-xs text-muted line-through">{formatPEN(p.compare_at_price)}</p>}
                  </Td>
                  <Td className="text-right">
                    <span className={p.stock === 0 ? "font-semibold text-danger" : low ? "font-semibold text-accent" : ""}>{p.stock}</span>
                    <p className="text-xs text-muted">mín. {p.min_stock}</p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {!p.is_available ? <Badge>Desactivado</Badge> : p.stock === 0 ? <Badge tone="danger">Agotado</Badge> : low ? <Badge tone="accent">Stock bajo</Badge> : <Badge tone="success">Disponible</Badge>}
                      {p.discount_percent > 0 && <Badge tone="accent">-{p.discount_percent}%</Badge>}
                      {p.is_featured && <Badge tone="brand">Destacado</Badge>}
                      {p.is_demo && <Badge tone="info">DEMO</Badge>}
                    </div>
                  </Td>
                  <Td className="text-right"><ProductRowActions product={{ id: p.id, name: p.name, slug: p.slug, is_available: p.is_available }} /></Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      {!lowOnly && <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref={href} />}
    </div>
  );
}
