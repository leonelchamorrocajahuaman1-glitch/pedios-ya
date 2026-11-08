"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, MapPin, Store } from "lucide-react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { env, isMapConfigured } from "@/lib/env";
import { distanceKm } from "@/lib/geo";

type Point = { lat: number; lng: number } | null;

function markerEl(color: string, label: string) {
  const el = document.createElement("div");
  el.setAttribute("aria-label", label);
  el.style.cssText = `width:34px;height:34px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 6px 20px rgba(0,0,0,.35);display:grid;place-items:center;color:white;font:700 14px system-ui`;
  el.textContent = label[0];
  return el;
}

/**
 * Mapa de seguimiento con Mapbox GL. Si no hay token configurado muestra un
 * panel alternativo (sin inventar posiciones).
 */
export function TrackingMap({ restaurant, destination, courier }: { restaurant: Point; destination: Point; courier: Point }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const courierMarker = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isMapConfigured || !container.current || map.current) return;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (!document.getElementById("mapbox-css")) {
          const link = document.createElement("link");
          link.id = "mapbox-css";
          link.rel = "stylesheet";
          link.href = `https://api.mapbox.com/mapbox-gl-js/v${mapboxgl.version}/mapbox-gl.css`;
          document.head.appendChild(link);
        }
        if (cancelled || !container.current) return;
        mapboxgl.accessToken = env.mapboxToken;
        const dark = document.documentElement.classList.contains("dark");
        const center = destination ?? restaurant ?? { lat: -12.12, lng: -77.03 };
        const m = new mapboxgl.Map({
          container: container.current,
          style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
          center: [center.lng, center.lat],
          zoom: 13.5,
          attributionControl: true,
        });
        m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.current = m;
        const bounds = new mapboxgl.LngLatBounds();
        if (restaurant) {
          new mapboxgl.Marker({ element: markerEl("#7c5cff", "Restaurante") }).setLngLat([restaurant.lng, restaurant.lat]).addTo(m);
          bounds.extend([restaurant.lng, restaurant.lat]);
        }
        if (destination) {
          new mapboxgl.Marker({ element: markerEl("#ff4d2e", "Destino") }).setLngLat([destination.lng, destination.lat]).addTo(m);
          bounds.extend([destination.lng, destination.lat]);
        }
        m.on("load", () => {
          if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 });
          setReady(true);
        });
      } catch (e) {
        console.error(e);
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualiza la posición del repartidor en tiempo real
  useEffect(() => {
    if (!ready || !map.current || !courier) return;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!courierMarker.current) {
        courierMarker.current = new mapboxgl.Marker({ element: markerEl("#12a150", "Repartidor") })
          .setLngLat([courier.lng, courier.lat])
          .addTo(map.current!);
      } else {
        courierMarker.current.setLngLat([courier.lng, courier.lat]);
      }
      map.current!.easeTo({ center: [courier.lng, courier.lat], duration: 800 });
    })();
  }, [courier, ready]);

  if (!isMapConfigured || failed) {
    const km = courier && destination ? distanceKm(courier, destination) : null;
    return (
      <div className="grid-bg relative flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface-2 p-5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
        <p className="relative text-xs text-muted">
          {failed ? "No se pudo cargar el mapa." : "Mapa no configurado (agrega NEXT_PUBLIC_MAPBOX_TOKEN)."} El seguimiento por estados sigue funcionando en tiempo real.
        </p>
        <div className="relative flex items-center justify-between gap-3">
          <span className="flex flex-col items-center gap-1 text-xs"><span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white"><Store className="h-5 w-5" /></span>Local</span>
          <span className="h-0.5 flex-1 bg-gradient-to-r from-accent via-success to-brand" />
          <span className="flex flex-col items-center gap-1 text-xs"><span className="grid h-11 w-11 place-items-center rounded-full bg-success text-white"><Bike className="h-5 w-5" /></span>{courier ? "Repartidor" : "Sin señal"}</span>
          <span className="h-0.5 flex-1 bg-gradient-to-r from-success to-brand" />
          <span className="flex flex-col items-center gap-1 text-xs"><span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white"><MapPin className="h-5 w-5" /></span>Tú</span>
        </div>
        <p className="relative text-sm font-medium">{km != null ? `El repartidor está a ${km.toFixed(1)} km de tu dirección` : "La ubicación del repartidor aparecerá cuando comparta su posición."}</p>
      </div>
    );
  }

  return <div ref={container} className="h-full min-h-72 w-full overflow-hidden rounded-3xl border border-border" role="region" aria-label="Mapa de seguimiento" />;
}
