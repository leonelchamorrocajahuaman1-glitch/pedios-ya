"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import { useRun } from "./use-run";
import { saveSettingsAction } from "@/lib/actions/admin";
import { DAYS } from "@/lib/constants";
import type { OpeningHour, StoreSettings } from "@/types";

const DEFAULT_HOURS: OpeningHour[] = Array.from({ length: 7 }, (_, day) => ({ day, open: "08:00", close: "21:00", closed: false }));

export function SettingsForm({ settings: s }: { settings: StoreSettings }) {
  const { pending, run } = useRun();
  const [flags, setFlags] = useState({ accepting: s.accepting_orders, delivery: s.delivery_enabled, pickup: s.pickup_enabled });
  const [hours, setHours] = useState<OpeningHour[]>(() => {
    const byDay = new Map((s.opening_hours ?? []).map((h) => [h.day, h]));
    return DEFAULT_HOURS.map((d) => byDay.get(d.day) ?? d);
  });
  const setHour = (day: number, patch: Partial<OpeningHour>) => setHours((hs) => hs.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  // Lunes primero en la vista
  const ordered = [...hours.slice(1), hours[0]];

  return (
    <form className="space-y-6" action={(fd) => void run(() => saveSettingsAction(fd))}>
      <input type="hidden" name="opening_hours" value={JSON.stringify(hours)} />
      <Card>
        <CardHeader><CardTitle>Datos del negocio</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre comercial" htmlFor="bn"><Input id="bn" name="business_name" defaultValue={s.business_name} required maxLength={80} /></Field>
          <Field label="Eslogan" htmlFor="sl"><Input id="sl" name="slogan" defaultValue={s.slogan} maxLength={120} /></Field>
          <ImageUpload name="logo_url" folder="brand" label="Logotipo (opcional, reemplaza al isotipo en los correos y avisos)" defaultValue={s.logo_url} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono" htmlFor="ph"><Input id="ph" name="phone" defaultValue={s.phone ?? ""} inputMode="tel" maxLength={20} /></Field>
            <Field label="WhatsApp" htmlFor="wa" hint="Con código de país, ej. +51 9…"><Input id="wa" name="whatsapp" defaultValue={s.whatsapp ?? ""} inputMode="tel" maxLength={20} /></Field>
          </div>
          <Field label="Correo" htmlFor="em"><Input id="em" name="email" type="email" defaultValue={s.email ?? ""} maxLength={120} /></Field>
          <Field label="Dirección de la tienda" htmlFor="ad"><Input id="ad" name="address" defaultValue={s.address} maxLength={200} /></Field>
          <Field label="Distrito" htmlFor="di"><Input id="di" name="district" defaultValue={s.district} maxLength={80} /></Field>
          <Field label="Ciudad" htmlFor="ci"><Input id="ci" name="city" defaultValue={s.city} maxLength={80} /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Horario de atención</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {ordered.map((h) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2/60 px-3 py-2 text-sm">
              <span className="w-24 font-medium">{DAYS[h.day]}</span>
              <Switch checked={!h.closed} onChange={(v) => setHour(h.day, { closed: !v })} label={h.closed ? "Cerrado" : "Abierto"} />
              {!h.closed && (
                <span className="flex items-center gap-2">
                  <input type="time" value={h.open} onChange={(e) => setHour(h.day, { open: e.target.value })} className="h-9 rounded-xl border border-border bg-surface px-2" aria-label={`Apertura ${DAYS[h.day]}`} />
                  a
                  <input type="time" value={h.close} onChange={(e) => setHour(h.day, { close: e.target.value })} className="h-9 rounded-xl border border-border bg-surface px-2" aria-label={`Cierre ${DAYS[h.day]}`} />
                </span>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">El horario se muestra al cliente. Para pausar los pedidos de inmediato usa «Recibir pedidos».</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pedidos y delivery</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div className="flex flex-wrap gap-6">
            <Switch name="accepting_orders" checked={flags.accepting} onChange={(v) => setFlags({ ...flags, accepting: v })} label="Recibir pedidos" />
            <Switch name="delivery_enabled" checked={flags.delivery} onChange={(v) => setFlags({ ...flags, delivery: v })} label="Delivery a domicilio" />
            <Switch name="pickup_enabled" checked={flags.pickup} onChange={(v) => setFlags({ ...flags, pickup: v })} label="Recojo en tienda" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Costo de delivery (S/)" htmlFor="df"><Input id="df" name="delivery_fee" type="number" step="0.10" min={0} defaultValue={s.delivery_fee} required /></Field>
            <Field label="Delivery gratis desde (S/)" htmlFor="ft" hint="Vacío = nunca gratis"><Input id="ft" name="free_delivery_threshold" type="number" step="0.10" min={0} defaultValue={s.free_delivery_threshold ?? ""} /></Field>
            <Field label="Compra mínima (S/)" htmlFor="mo"><Input id="mo" name="min_order_amount" type="number" step="0.10" min={0} defaultValue={s.min_order_amount} required /></Field>
            <Field label="Tiempo estimado" htmlFor="eta"><Input id="eta" name="delivery_eta" defaultValue={s.delivery_eta} required maxLength={60} placeholder="30 a 60 min" /></Field>
          </div>
          <Field label="Stock mínimo por defecto para productos nuevos" htmlFor="ls" className="max-w-xs"><Input id="ls" name="low_stock_default" type="number" min={0} max={1000} defaultValue={s.low_stock_default} /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mensajes para el cliente</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Bienvenida (inicio)" htmlFor="m1"><Textarea id="m1" name="welcome_message" defaultValue={s.welcome_message} maxLength={300} className="min-h-20" /></Field>
          <Field label="Aviso en el checkout" htmlFor="m2"><Textarea id="m2" name="checkout_message" defaultValue={s.checkout_message} maxLength={300} className="min-h-20" /></Field>
          <Field label="Confirmación del pedido" htmlFor="m3"><Textarea id="m3" name="order_confirmation_message" defaultValue={s.order_confirmation_message} maxLength={300} className="min-h-20" /></Field>
          <Field label="Atención al cliente" htmlFor="m4"><Textarea id="m4" name="support_message" defaultValue={s.support_message} maxLength={300} className="min-h-20" /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Redes sociales</CardTitle></CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <Field label="Facebook" htmlFor="fb"><Input id="fb" name="facebook_url" type="url" defaultValue={s.facebook_url ?? ""} placeholder="https://facebook.com/…" /></Field>
          <Field label="Instagram" htmlFor="ig"><Input id="ig" name="instagram_url" type="url" defaultValue={s.instagram_url ?? ""} placeholder="https://instagram.com/…" /></Field>
          <Field label="TikTok" htmlFor="tt"><Input id="tt" name="tiktok_url" type="url" defaultValue={s.tiktok_url ?? ""} placeholder="https://tiktok.com/@…" /></Field>
        </CardBody>
      </Card>

      <div className="flex justify-end"><Button type="submit" size="lg" loading={pending}>Guardar configuración</Button></div>
    </form>
  );
}
