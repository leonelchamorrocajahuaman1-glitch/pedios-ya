import Link from "next/link";
import { Bike, Clock } from "lucide-react";
import type { Restaurant } from "@/types";
import { SmartImage } from "@/components/ui/smart-image";
import { Rating } from "@/components/ui/rating";
import { formatHour, formatPEN } from "@/lib/format";
import { FavoriteButton } from "@/components/restaurant/favorite-button";
import { cn } from "@/lib/utils";

export function RestaurantCard({
  restaurant: r,
  distanceKm,
  isFavorite,
  canFavorite,
}: {
  restaurant: Restaurant;
  distanceKm?: number | null;
  isFavorite?: boolean;
  canFavorite?: boolean;
}) {
  const open = Boolean(r.is_open);
  return (
    <article className="group relative">
      <Link href={`/restaurante/${r.slug}`} className="block" aria-label={r.name}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-surface-2">
          <SmartImage
            src={r.cover_url}
            alt={r.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn("object-cover transition duration-700 group-hover:scale-105", !open && "grayscale-[60%]")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur",
                open ? "bg-success/90 text-white" : "bg-black/70 text-white",
              )}
            >
              {open ? "Abierto" : `Cerrado · abre ${formatHour(r.opens_at)}`}
            </span>
            {r.delivery_fee === 0 && <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-black">Envío gratis</span>}
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border-2 border-white/90 bg-white">
              <SmartImage src={r.logo_url} alt="" fill sizes="44px" className="object-cover" />
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1 px-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold leading-tight tracking-tight group-hover:text-brand">{r.name}</h3>
            <Rating value={r.rating_avg} count={r.rating_count} className="shrink-0" />
          </div>
          <p className="line-clamp-1 text-sm text-muted">{r.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.delivery_time_min}–{r.delivery_time_max} min</span>
            <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {r.delivery_fee === 0 ? "Gratis" : formatPEN(r.delivery_fee)}</span>
            <span>{formatHour(r.opens_at)}–{formatHour(r.closes_at)}</span>
            {distanceKm != null && <span>{distanceKm.toFixed(1)} km</span>}
          </div>
        </div>
      </Link>
      {canFavorite && (
        <div className="absolute right-3 top-3">
          <FavoriteButton restaurantId={r.id} initial={Boolean(isFavorite)} />
        </div>
      )}
    </article>
  );
}
