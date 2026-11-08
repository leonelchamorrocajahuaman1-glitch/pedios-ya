import { env } from "@/lib/env";

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  district?: string;
}

/** Geocodificación con Mapbox (solo si NEXT_PUBLIC_MAPBOX_TOKEN está configurado). */
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  if (!env.mapboxToken || query.trim().length < 4) return [];
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("country", "pe");
  url.searchParams.set("language", "es");
  url.searchParams.set("limit", "5");
  url.searchParams.set("proximity", "-77.03,-12.12");
  url.searchParams.set("access_token", env.mapboxToken);
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    features: { properties: { full_address?: string; name: string; context?: { locality?: { name: string }; place?: { name: string } } }; geometry: { coordinates: [number, number] } }[];
  };
  return json.features.map((f) => ({
    label: f.properties.full_address ?? f.properties.name,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    district: f.properties.context?.locality?.name ?? f.properties.context?.place?.name,
  }));
}
