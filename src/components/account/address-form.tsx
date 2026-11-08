"use client";

import { useState, useTransition } from "react";
import { LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { saveAddressAction } from "@/lib/actions/account";
import { geocodeAddress, type GeocodeResult } from "@/lib/mapbox";
import { isMapConfigured } from "@/lib/env";
import type { Address } from "@/types";

/** Alta/edición de dirección con coordenadas (Mapbox o ubicación del dispositivo). */
export function AddressForm({ address, onSaved }: { address?: Address; onSaved?: (id: string) => void }) {
  const [pending, start] = useTransition();
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: address?.lat ?? null, lng: address?.lng ?? null });
  const [street, setStreet] = useState(address?.street ?? "");
  const [district, setDistrict] = useState(address?.district ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    setSearching(true);
    const r = await geocodeAddress(`${street} ${district} Lima`);
    setResults(r);
    setSearching(false);
    if (!r.length) toast.message("No encontramos la dirección. Puedes usar tu ubicación actual.");
  }

  function locate() {
    if (!navigator.geolocation) return toast.error("Tu dispositivo no permite obtener la ubicación.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) });
        toast.success("Ubicación capturada");
      },
      () => toast.error("No pudimos obtener tu ubicación. Revisa los permisos."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          fd.set("lat", coords.lat?.toString() ?? "");
          fd.set("lng", coords.lng?.toString() ?? "");
          const res = await saveAddressAction(fd);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message ?? "Guardado");
          onSaved?.(res.data!.id);
        })
      }
    >
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="label">
          <Input id="label" name="label" defaultValue={address?.label ?? "Casa"} maxLength={40} required />
        </Field>
        <Field label="Distrito" htmlFor="district">
          <Input id="district" name="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Miraflores" required maxLength={80} />
        </Field>
      </div>
      <Field label="Dirección" htmlFor="street">
        <Input id="street" name="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Av. José Pardo 520, dpto 402" required maxLength={200} />
      </Field>
      <input type="hidden" name="city" value="Lima" />
      <Field label="Referencia" htmlFor="reference" hint="Ayuda al repartidor: color de fachada, intercomunicador, etc.">
        <Input id="reference" name="reference" defaultValue={address?.reference ?? ""} maxLength={250} placeholder="Frente al parque, puerta negra" />
      </Field>

      <div className="space-y-2 rounded-2xl bg-surface-2 p-4">
        <p className="text-sm font-semibold">Ubicación en el mapa</p>
        <p className="text-xs text-muted">
          {coords.lat != null ? `Coordenadas: ${coords.lat}, ${coords.lng}` : "Sin coordenadas: el envío se cobrará con la tarifa base del local."}
        </p>
        <div className="flex flex-wrap gap-2">
          {isMapConfigured && (
            <Button type="button" variant="outline" size="sm" onClick={search} loading={searching} disabled={street.length < 4}>
              <Search className="h-4 w-4" /> Buscar dirección
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={locate}>
            <LocateFixed className="h-4 w-4" /> Usar mi ubicación
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 space-y-1">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-surface"
                  onClick={() => {
                    setCoords({ lat: r.lat, lng: r.lng });
                    if (r.district && !district) setDistrict(r.district);
                    setResults([]);
                  }}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Checkbox name="is_default" defaultChecked={address?.is_default} label="Usar como dirección principal" />
      <Button type="submit" loading={pending} className="w-full sm:w-auto">Guardar dirección</Button>
    </form>
  );
}
