"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, Phone, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatPEN } from "@/lib/format";
import type { OrderStatus, PaymentMethod } from "@/types";

export interface CourierOrder {
  id: string;
  code: string;
  status: OrderStatus;
  delivery_address: string;
  delivery_district: string;
  delivery_reference: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  contact_phone: string | null;
  total: number;
  payment_method: PaymentMethod;
  payment_status: string;
  restaurant: { name: string; address: string; phone: string | null } | null;
  items: { product_name: string; quantity: number }[];
}

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  courier_assigned: { status: "picked_up", label: "Recogí el pedido" },
  picked_up: { status: "on_the_way", label: "Salí a entregar" },
  on_the_way: { status: "delivered", label: "Pedido entregado" },
};

export function CourierApp({ token, name, consent: initialConsent, available: initialAvailable, orders }: {
  token: string;
  name: string;
  consent: boolean;
  available: boolean;
  orders: CourierOrder[];
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(initialConsent);
  const [available, setAvailable] = useState(initialAvailable);
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  async function post(path: string, body: unknown) {
    const res = await fetch(`/api/courier/${token}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Error");
    return json;
  }

  async function updateFlags(patch: { consent?: boolean; available?: boolean }) {
    try {
      await post("consent", patch);
      if (patch.consent !== undefined) setConsent(patch.consent);
      if (patch.available !== undefined) setAvailable(patch.available);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  useEffect(() => {
    if (!consent || !sharing) return;
    if (!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      async (p) => {
        try {
          await post("location", { lat: p.coords.latitude, lng: p.coords.longitude, heading: p.coords.heading, speed: p.coords.speed });
          setLastSent(new Date());
        } catch (e) {
          toast.error((e as Error).message);
        }
      },
      () => {
        toast.error("Permiso de ubicación denegado");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, sharing]);

  async function advance(orderId: string, status: OrderStatus) {
    setBusy(orderId);
    try {
      await post("status", { order_id: orderId, status });
      toast.success(ORDER_STATUS_LABEL[status]);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">Hola,</p>
        <h1 className="font-display text-2xl font-bold">{name}</h1>
      </div>
      <Card>
        <CardBody className="space-y-4">
          <Switch checked={available} onChange={(v) => updateFlags({ available: v })} label="Disponible para recibir pedidos" />
          <Switch
            checked={consent}
            onChange={(v) => {
              updateFlags({ consent: v });
              if (!v) setSharing(false);
            }}
            label="Autorizo compartir mi ubicación durante las entregas"
          />
          <p className="text-xs text-muted">Tu ubicación solo la ven el administrador y el cliente del pedido activo. Puedes revocar el permiso en cualquier momento.</p>
          {consent && (
            <Button variant={sharing ? "outline" : "success"} onClick={() => {
                if (!sharing && !navigator.geolocation) return void toast.error("Este dispositivo no permite compartir ubicación");
                setSharing((s) => !s);
              }} className="w-full">
              <Radio className={sharing ? "h-4 w-4 animate-pulse text-success" : "h-4 w-4"} />
              {sharing ? "Dejar de compartir ubicación" : "Empezar a compartir ubicación"}
            </Button>
          )}
          {sharing && <p className="text-center text-xs text-muted">{lastSent ? `Última posición enviada: ${lastSent.toLocaleTimeString("es-PE")}` : "Obteniendo GPS…"}</p>}
        </CardBody>
      </Card>

      <h2 className="font-display text-lg font-semibold">Pedidos asignados</h2>
      {orders.length === 0 && <EmptyState title="Sin pedidos activos" description="Cuando te asignen un pedido aparecerá aquí." />}
      {orders.map((o) => {
        const next = NEXT[o.status];
        return (
          <Card key={o.id}>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold">{o.code}</span>
                <Badge tone="brand">{ORDER_STATUS_LABEL[o.status]}</Badge>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="text-xs text-muted">Recoger en</p>
                <p className="font-semibold">{o.restaurant?.name}</p>
                <p>{o.restaurant?.address}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="text-xs text-muted">Entregar en</p>
                <p className="font-semibold">{o.delivery_address}{o.delivery_district && `, ${o.delivery_district}`}</p>
                {o.delivery_reference && <p className="text-muted">Ref.: {o.delivery_reference}</p>}
                <div className="mt-2 flex gap-2">
                  {o.delivery_lat != null && (
                    <a className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1.5 text-xs font-semibold text-info" href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}`} target="_blank" rel="noreferrer">
                      <Navigation className="h-3.5 w-3.5" /> Navegar
                    </a>
                  )}
                  {o.contact_phone && (
                    <a className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success" href={`tel:${o.contact_phone.replace(/\s/g, "")}`}>
                      <Phone className="h-3.5 w-3.5" /> Llamar cliente
                    </a>
                  )}
                </div>
              </div>
              <p className="text-muted"><MapPin className="mr-1 inline h-3.5 w-3.5" />{o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
              <p>
                Cobro: <strong>{PAYMENT_METHOD_LABEL[o.payment_method]}</strong>
                {o.payment_method === "cash" ? ` · cobrar ${formatPEN(o.total)}` : o.payment_status === "approved" ? " · ya pagado" : " · pago por confirmar"}
              </p>
              {next && (
                <Button className="w-full" size="lg" loading={busy === o.id} onClick={() => advance(o.id, next.status)}>
                  {next.label}
                </Button>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
