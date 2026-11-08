import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { RestaurantCard } from "@/components/home/restaurant-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Restaurant } from "@/types";

export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const { userId } = await requireUser("/cuenta/favoritos");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("favorites")
    .select("restaurants(*, is_open)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const restaurants = (data ?? []).map((f) => f.restaurants as unknown as Restaurant).filter(Boolean);
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Tus favoritos</h2>
      {restaurants.length === 0 ? (
        <EmptyState icon={<Heart />} title="Aún no tienes favoritos" description="Toca el corazón en un restaurante para guardarlo aquí." />
      ) : (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
          {restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} canFavorite isFavorite />)}
        </div>
      )}
    </div>
  );
}
