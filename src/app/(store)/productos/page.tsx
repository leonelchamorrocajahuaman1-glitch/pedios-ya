import type { Metadata } from "next";
import { Catalog, type CatalogParams } from "@/components/store/catalog";
import { getCategoryTree } from "@/lib/services/store";

export const metadata: Metadata = { title: "Catálogo de productos" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const [params, categories] = await Promise.all([searchParams, getCategoryTree()]);
  const title = params.q ? `Resultados para «${params.q.slice(0, 60)}»` : params.ofertas === "1" ? "Ofertas especiales" : params.destacados === "1" ? "Productos destacados" : "Todos los productos";
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <Catalog params={params} categories={categories} basePath="/productos" />
    </div>
  );
}
