"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableWrap, Td, Th, Tr } from "./table";
import { generateCourierLinkAction, revokeCourierLinkAction, saveCourierAction } from "@/lib/actions/admin";
import { formatPEN, formatRelative } from "@/lib/format";
import type { Courier } from "@/types";

export type CourierRow = Courier & { has_link: boolean; deliveries: number; active_orders: number; earnings: number };

export function CourierManager({ couriers }: { couriers: CourierRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CourierRow | "new" | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = editing && editing !== "new" ? editing : undefined;

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Registrar repartidor</Button></div>
      {couriers.length === 0 ? <EmptyState title="Sin repartidores" description="Registra a tu primer repartidor para asignar pedidos." /> : (
        <TableWrap>
          <thead><tr><Th>Repartidor</Th><Th>Estado</Th><Th>Entregas</Th><Th>Ganancias (envíos)</Th><Th>Ubicación</Th><Th className="text-right">Acciones</Th></tr></thead>
          <tbody>
            {couriers.map((k) => (
              <Tr key={k.id}>
                <Td><p className="font-semibold">{k.full_name}</p><p className="text-xs text-muted">{k.phone} · {k.vehicle_type}{k.vehicle_plate && ` · ${k.vehicle_plate}`}</p></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={k.status === "active" ? "success" : k.status === "pending" ? "warning" : "danger"}>{k.status === "active" ? "Activo" : k.status === "pending" ? "Pendiente" : "Suspendido"}</Badge>
                    {k.is_available && <Badge tone="info">Disponible</Badge>}
                  </div>
                </Td>
                <Td>{k.deliveries}{k.active_orders > 0 && <span className="text-xs text-muted"> · {k.active_orders} en curso</span>}</Td>
                <Td>{formatPEN(k.earnings)}</Td>
                <Td>
                  {k.location_consent && k.last_lat != null ? (
                    <a className="inline-flex items-center gap-1 text-sm text-brand hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${k.last_lat},${k.last_lng}`}>
                      <MapPin className="h-3.5 w-3.5" /> {k.last_seen_at ? formatRelative(k.last_seen_at) : "Ver"}
                    </a>
                  ) : <span className="text-xs text-muted">{k.location_consent ? "Sin señal" : "No autorizó seguimiento"}</span>}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" disabled={k.status !== "active"} loading={pending} onClick={() => start(async () => {
                      const res = await generateCourierLinkAction(k.id);
                      if (!res.ok) return void toast.error(res.error);
                      setLink(res.data!.url);
                      router.refresh();
                    })}><Link2 className="h-3.5 w-3.5" /> {k.has_link ? "Nuevo enlace" : "Generar enlace"}</Button>
                    {k.has_link && (
                      <ConfirmButton size="sm" variant="ghost" title="¿Revocar enlace?" description="El repartidor dejará de tener acceso inmediatamente." confirmLabel="Revocar" onConfirm={async () => {
                        const res = await revokeCourierLinkAction(k.id);
                        if (!res.ok) toast.error(res.error); else { toast.success(res.message); router.refresh(); }
                      }}>Revocar</ConfirmButton>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setEditing(k)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={c ? "Editar repartidor" : "Registrar repartidor"}>
        <form key={c?.id ?? "new"} className="space-y-4 p-6" action={(fd) => start(async () => {
          const res = await saveCourierAction(fd);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          setEditing(null);
          router.refresh();
        })}>
          {c && <input type="hidden" name="id" value={c.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="kn"><Input id="kn" name="full_name" defaultValue={c?.full_name} required /></Field>
            <Field label="Celular" htmlFor="kp"><Input id="kp" name="phone" defaultValue={c?.phone} required inputMode="tel" /></Field>
            <Field label="DNI / CE" htmlFor="kd"><Input id="kd" name="document_id" defaultValue={c?.document_id ?? ""} /></Field>
            <Field label="Vehículo" htmlFor="kv">
              <Select id="kv" name="vehicle_type" defaultValue={c?.vehicle_type ?? "moto"}>
                <option value="moto">Moto</option><option value="bicicleta">Bicicleta</option><option value="auto">Auto</option><option value="a_pie">A pie</option>
              </Select>
            </Field>
            <Field label="Placa" htmlFor="kpl"><Input id="kpl" name="vehicle_plate" defaultValue={c?.vehicle_plate ?? ""} maxLength={12} /></Field>
            <Field label="Estado" htmlFor="ks">
              <Select id="ks" name="status" defaultValue={c?.status ?? "active"}>
                <option value="active">Activo</option><option value="pending">Pendiente</option><option value="suspended">Suspendido</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" loading={pending}>Guardar</Button>
        </form>
      </Dialog>

      <Dialog open={Boolean(link)} onClose={() => setLink(null)} title="Enlace personal del repartidor" size="md">
        <div className="space-y-4 p-6 text-sm">
          <p className="text-muted">Compártelo solo con el repartidor (por ejemplo, por WhatsApp). Desde ahí verá sus pedidos, actualizará estados y, si lo autoriza, compartirá su ubicación. <strong>Por seguridad solo se muestra una vez.</strong></p>
          <code className="block break-all rounded-2xl bg-surface-2 p-4 text-xs">{link}</code>
          <Button onClick={() => { navigator.clipboard.writeText(link ?? ""); toast.success("Enlace copiado"); }}><Copy className="h-4 w-4" /> Copiar enlace</Button>
        </div>
      </Dialog>
    </>
  );
}
