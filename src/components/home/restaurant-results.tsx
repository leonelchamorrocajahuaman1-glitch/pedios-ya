import { SearchX } from "lucide-react";
import type { Restaurant } from "@/types";
import { RestaurantCard } from "./restaurant-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StaggerReveal } from "@/components/motion/reveal";

export function RestaurantResults({
  restaurants,
  favoriteIds,
  canFavorite,
  emptyTitle = "No encontramos resultados",
}: {
  restaurants: Restaurant[];
  favoriteIds: string[];
  canFavorite: boolean;
  emptyTitle?: string;
}) {
  if (!restaurants.length) {
    return <EmptyState icon={<SearchX />} title={emptyTitle} description="Prueba con otra palabra o quita algunos filtros." />;
  }
  return (
    <StaggerReveal key={restaurants.map((r) => r.id).join()} className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {restaurants.map((r) => (
        <RestaurantCard key={r.id} restaurant={r} canFavorite={canFavorite} isFavorite={favoriteIds.includes(r.id)} />
      ))}
    </StaggerReveal>
  );
}
