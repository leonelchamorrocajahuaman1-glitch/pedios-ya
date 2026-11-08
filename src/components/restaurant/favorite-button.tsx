"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/lib/actions/account";
import { cn } from "@/lib/utils";

export function FavoriteButton({ restaurantId, initial, className }: { restaurantId: string; initial: boolean; className?: string }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFav((v) => !v);
          const res = await toggleFavoriteAction(restaurantId, !fav);
          if (!res.ok) {
            setFav((v) => !v);
            toast.error(res.error);
          }
        })
      }
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:scale-110",
        className,
      )}
      aria-pressed={fav}
      aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
    >
      <Heart className={cn("h-4.5 w-4.5 transition", fav && "fill-brand text-brand")} />
    </button>
  );
}
