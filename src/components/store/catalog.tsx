import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { Category } from "@/types";
import { listProducts, type ProductSort } from "@/lib/services/store";
import { ProductGrid } from "./product-card";
import { CatalogControls } from "./catalog-controls";
import { CategoryChips } from "@/components/home/category-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CatalogParams {
  q?: string;
  orden?: string;
  ofertas?: string;
  destacados?: string;
  disponibles?: string;
  sub?: string;
  pagina?: string;
}

const SORTS: ProductSort[] = ["relevancia", "precio-asc", "precio-desc", "nuevos", "nombre"];
const PAGE_SIZE = 24;

export async function Catalog({ params, categories, category, basePath }: { params: CatalogParams; categories: Category[]; category?: Category; basePath: string }) {
  const page = Math.max(1, Number(params.pagina) || 1);
  const sub = category?.children?.find((c) => c.slug === params.sub);
  const { products, total } = await listProducts({
    q: params.q,
    categoryIds: category ? [category.id] : undefined,
    subcategoryId: sub?.id,
    offers: params.ofertas === "1",
    featured: params.destacados === "1",
    inStock: params.disponibles === "1",
    sort: SORTS.includes(params.orden as ProductSort) ? (params.orden as ProductSort) : "relevancia",
    page,
    pageSize: PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const n = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    n.set("pagina", String(p));
    return `${basePath}?${n}`;
  };

  return (
    <div className="space-y-6">
      <CategoryChips categories={categories} activeSlug={category?.slug} />
      {category?.children && category.children.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href={basePath} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", !sub ? "bg-accent text-white" : "bg-surface-2 hover:bg-accent/15")}>Todas</Link>
          {category.children.map((c) => (
            <Link key={c.id} href={`${basePath}?sub=${c.slug}`} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", sub?.id === c.id ? "bg-accent text-white" : "bg-surface-2 hover:bg-accent/15")}>
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <Suspense>
        <CatalogControls total={total} />
      </Suspense>
      {products.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No encontramos productos"
          description={params.q ? `No hay resultados para «${params.q}». Prueba con otra palabra.` : "Prueba quitando algunos filtros."}
          action={<Link href="/productos" className={buttonStyles({ variant: "outline" })}>Ver todo el catálogo</Link>}
        />
      ) : (
        <ProductGrid products={products} />
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 pt-4" aria-label="Paginación">
          {page > 1 ? <Link className={buttonStyles({ variant: "outline", size: "sm" })} href={href(page - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Link> : <span />}
          <span className="text-sm text-muted">Página {page} de {pages}</span>
          {page < pages ? <Link className={buttonStyles({ variant: "outline", size: "sm" })} href={href(page + 1)}>Siguiente <ChevronRight className="h-4 w-4" /></Link> : <span />}
        </nav>
      )}
    </div>
  );
}
