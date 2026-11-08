"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Restaurant } from "@/types";
import { RestaurantCard } from "./restaurant-card";
import { Button } from "@/components/ui/button";
import { distanceKm } from "@/lib/geo";
import { useSelectedAddress } from "@/hooks/use-selected-address";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Restaurantes cercanos: usa las coordenadas de la dirección elegida o, con permiso,
 * la ubicación del navegador. Nunca se envía la ubicación a terceros.
 */
export function NearbyRestaurants({
  restaurants,
  favoriteIds,
  canFavorite,
}: {
  restaurants: Restaurant[];
  favoriteIds: string[];
  canFavorite: boolean;
}) {
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const { addressId } = useSelectedAddress();

  useEffect(() => {
    if (!addressId || !canFavorite) return;
    getSupabaseBrowserClient()
      .from("addresses")
      .select("lat, lng, label")
      .eq("id", addressId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.lat != null && data?.lng != null) setOrigin({ lat: data.lat, lng: data.lng, label: data.label });
      });
  }, [addressId, canFavorite]);

  const list = useMemo(() => {
    const withDist = restaurants.map((r) => ({
      r,
      d: origin && r.lat != null && r.lng != null ? distanceKm(origin, { lat: r.lat, lng: r.lng }) : null,
    }));
    if (origin) withDist.sort((a, b) => (a.d ?? 999) - (b.d ?? 999));
    else withDist.sort((a, b) => a.r.delivery_time_min - b.r.delivery_time_min);
    return withDist.slice(0, 6);
  }, [restaurants, origin]);

  function locate() {
    if (!navigator.geolocation) return toast.error("Tu navegador no permite obtener la ubicación.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "tu ubicación" });
        setLocating(false);
      },
      () => {
        toast.error("No pudimos obtener tu ubicación. Revisa los permisos del navegador.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted">
          <MapPin className="h-4 w-4 text-brand" />
          {origin ? `Ordenados por distancia desde ${origin.label}` : "Ordenados por tiempo de entrega"}
        </p>
        <Button variant="outline" size="sm" onClick={locate} loading={locating}>
          <LocateFixed className="h-4 w-4" /> Usar mi ubicación
        </Button>
      </div>
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ r, d }) => (
          <RestaurantCard key={r.id} restaurant={r} distanceKm={d} canFavorite={canFavorite} isFavorite={favoriteIds.includes(r.id)} />
        ))}
      </div>
    </div>
  );
}
