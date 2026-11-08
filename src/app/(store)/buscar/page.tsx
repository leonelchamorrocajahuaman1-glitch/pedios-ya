import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryRail } from "@/components/home/category-rail";
import { RestaurantFilters } from "@/components/home/restaurant-filters";
import { RestaurantResults } from "@/components/home/restaurant-results";
import { getCategories, getRestaurants } from "@/lib/services/catalog";
import { getFavoriteIds } from "@/lib/services/account";
import { getSession } from "@/lib/auth";
import { parseListing, type ListingParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Buscar restaurantes y productos" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  const filters = parseListing(await searchParams);
  const [session, categories, restaurants] = await Promise.all([getSession(), getCategories(), getRestaurants(filters)]);
  const favoriteIds = await getFavoriteIds(session?.userId);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {filters.q ? <>Resultados para «{filters.q}»</> : "Todos los negocios"}
        </h1>
        <p className="mt-1 text-sm text-muted">{restaurants.length} negocio(s) encontrados</p>
      </div>
      <CategoryRail categories={categories} />
      <Suspense>
        <RestaurantFilters />
      </Suspense>
      <RestaurantResults restaurants={restaurants} favoriteIds={favoriteIds} canFavorite={Boolean(session)} />
    </div>
  );
}
