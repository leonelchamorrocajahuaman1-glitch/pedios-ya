"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useRun } from "./use-run";
import { deleteDeliveryZoneAction, saveDeliveryZoneAction } from "@/lib/actions/admin";
import { formatPEN } from "@/lib/format";
import type { DeliveryZone } from "@/types";

/** Zonas de reparto por distrito (preparadas para tarifas diferenciadas). Sin GPS ni mapas. */
export function DeliveryZones({ zones }: { zones: DeliveryZone[] }) {
  const { pending, run } = useRun();
  const [editing, setEditing] = useState<DeliveryZone | "new" | null>(null);
  const [active, setActive] = useState(true);
  const z = editing && editing !== "new" ? editing : undefined;
  const open = (v: DeliveryZone | "new") => {
    setActive(v === "new" ? true : v.is_active);
    setEditing(v);
  };
  return (
    <div className="space-y-3">
      {zones.length === 0 && <p className="text-sm text-muted">Sin zonas registradas: se usa el costo de delivery general para cualquier dirección.</p>}
      {zones.map((zone) => (
        <div key={zone.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{zone.name} {!zone.is_active && <Badge>Inactiva</Badge>}</p>
            <p className="text-xs text-muted">{zone.districts.join(", ")}</p>
          </div>
          <span>{formatPEN(zone.fee)}{zone.min_order_amount != null && <span className="text-xs text-muted"> · mín. {formatPEN(zone.min_order_amount)}</span>}{zone.eta && <span className="text-xs text-muted"> · {zone.eta}</span>}</span>
          <Button size="icon" variant="ghost" onClick={() => open(zone)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
          <ConfirmButton size="icon" variant="ghost" aria-label="Eliminar" title={`¿Eliminar la zona «${zone.name}»?`} confirmLabel="Eliminar" onConfirm={() => run(() => deleteDeliveryZoneAction(zone.id))}>
            <Trash2 className="h-4 w-4 text-danger" />
          </ConfirmButton>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => open("new")}><Plus className="h-4 w-4" /> Agregar zona</Button>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={z ? "Editar zona" : "Nueva zona de reparto"}>
        <form key={z?.id ?? "new"} className="space-y-4 p-6" action={(fd) => void run(() => saveDeliveryZoneAction(fd), () => setEditing(null))}>
          {z && <input type="hidden" name="id" value={z.id} />}
          <Field label="Nombre" htmlFor="zn"><Input id="zn" name="name" defaultValue={z?.name} required maxLength={60} placeholder="Zona centro" /></Field>
          <Field label="Distritos (separados por coma)" htmlFor="zd"><Input id="zd" name="districts" defaultValue={z?.districts.join(", ")} required placeholder="Ate, Santa Anita" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Costo (S/)" htmlFor="zf"><Input id="zf" name="fee" type="number" step="0.10" min={0} defaultValue={z?.fee ?? 5} required /></Field>
            <Field label="Compra mínima" htmlFor="zm" hint="Opcional"><Input id="zm" name="min_order_amount" type="number" step="0.10" min={0} defaultValue={z?.min_order_amount ?? ""} /></Field>
            <Field label="Tiempo" htmlFor="ze" hint="Opcional"><Input id="ze" name="eta" defaultValue={z?.eta ?? ""} maxLength={60} /></Field>
          </div>
          <Switch name="is_active" checked={active} onChange={setActive} label="Zona activa" />
          <Button type="submit" loading={pending}>Guardar zona</Button>
        </form>
      </Dialog>
    </div>
  );
}
