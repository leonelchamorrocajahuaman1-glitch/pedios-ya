import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryRail } from "@/components/home/category-rail";
import { CategoryIcon } from "@/components/home/category-icon";
import { RestaurantFilters } from "@/components/home/restaurant-filters";
import { RestaurantResults } from "@/components/home/restaurant-results";
import { getCategories, getCategoryBySlug, getRestaurants } from "@/lib/services/catalog";
import { getFavoriteIds } from "@/lib/services/account";
import { getSession } from "@/lib/auth";
import { parseListing, type ListingParams } from "@/lib/search-params";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ListingParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  return { title: category ? `${category.name} a domicilio` : "Categoría" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category || !category.is_active) notFound();
  const filters = parseListing(await searchParams);
  const [session, categories, restaurants] = await Promise.all([
    getSession(),
    getCategories(),
    getRestaurants({ ...filters, categoryId: category.id }),
  ]);
  const favoriteIds = await getFavoriteIds(session?.userId);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand to-accent text-white shadow-lg">
          <CategoryIcon name={category.icon} className="h-8 w-8" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{category.name}</h1>
          <p className="text-sm text-muted">{restaurants.length} negocio(s) con delivery</p>
        </div>
      </div>
      <CategoryRail categories={categories} activeSlug={slug} />
      <Suspense>
        <RestaurantFilters />
      </Suspense>
      <RestaurantResults
        restaurants={restaurants}
        favoriteIds={favoriteIds}
        canFavorite={Boolean(session)}
        emptyTitle={`Aún no hay negocios de ${category.name.toLowerCase()}`}
      />
    </div>
  );
}
