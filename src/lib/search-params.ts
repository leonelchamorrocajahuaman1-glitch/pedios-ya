import type { RestaurantSort } from "@/lib/services/catalog";

export interface ListingParams {
  q?: string;
  orden?: string;
  abiertos?: string;
  envio?: string;
}

export function parseListing(sp: ListingParams) {
  const sorts: RestaurantSort[] = ["recommended", "rating", "delivery_time", "delivery_fee"];
  return {
    q: typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined,
    sort: (sorts.includes(sp.orden as RestaurantSort) ? sp.orden : "recommended") as RestaurantSort,
    openOnly: sp.abiertos === "1",
    freeDelivery: sp.envio === "gratis",
  };
}
