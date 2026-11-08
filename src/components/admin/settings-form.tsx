"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import { purgeDemoDataAction, saveSettingsAction } from "@/lib/actions/admin";
import type { PlatformSettings } from "@/types";

export function SettingsForm({ settings: s, integrations }: { settings: PlatformSettings; integrations: { label: string; ok: boolean; hint: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <form className="space-y-6" action={(fd) => start(async () => {
        const res = await saveSettingsAction(fd);
        if (!res.ok) toast.error(res.error); else { toast.success(res.message); router.refresh(); }
      })}>
        <Card>
          <CardHeader><CardTitle>Marca</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre de la plataforma" htmlFor="pn"><Input id="pn" name="platform_name" defaultValue={s.platform_name} required maxLength={40} /></Field>
            <ImageUpload name="logo_url" folder="brand" label="Logotipo (opcional)" defaultValue={s.logo_url} />
            <Field label="Color principal" htmlFor="pc"><Input id="pc" name="primary_color" type="color" defaultValue={s.primary_color} className="h-12 p-1" /></Field>
            <Field label="Color de acento" htmlFor="ac"><Input id="ac" name="accent_color" type="color" defaultValue={s.accent_color} className="h-12 p-1" /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Comisiones y envíos</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-3">
            <Field label="Comisión por defecto (%)" htmlFor="dc"><Input id="dc" name="default_commission_rate" type="number" step="0.5" min={0} max={50} defaultValue={(Number(s.default_commission_rate) * 100).toFixed(1)} /></Field>
            <Field label="Tarifa base de envío (S/)" htmlFor="bf"><Input id="bf" name="base_delivery_fee" type="number" step="0.10" min={0} defaultValue={s.base_delivery_fee} /></Field>
            <Field label="Costo por km adicional (S/)" htmlFor="fk"><Input id="fk" name="fee_per_km" type="number" step="0.10" min={0} defaultValue={s.fee_per_km} /></Field>
            <Field label="Km incluidos en la tarifa" htmlFor="ik"><Input id="ik" name="included_km" type="number" step="0.5" min={0} defaultValue={s.included_km} /></Field>
            <Field label="Radio máximo de reparto (km)" htmlFor="mk"><Input id="mk" name="max_delivery_km" type="number" step="0.5" min={1} defaultValue={s.max_delivery_km} /></Field>
            <Field label="Envío gratis desde (S/)" htmlFor="ft" hint="Vacío = desactivado"><Input id="ft" name="free_delivery_threshold" type="number" step="0.10" min={0} defaultValue={s.free_delivery_threshold ?? ""} /></Field>
            <Field label="Tarifa de servicio (S/)" htmlFor="sf"><Input id="sf" name="service_fee" type="number" step="0.10" min={0} defaultValue={s.service_fee} /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Métodos de pago</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Checkbox name="payment_cash_enabled" defaultChecked={s.payment_cash_enabled} label="Efectivo contra entrega" />
              <Checkbox name="payment_yape_enabled" defaultChecked={s.payment_yape_enabled} label="Yape (verificación manual)" />
              <Checkbox name="payment_plin_enabled" defaultChecked={s.payment_plin_enabled} label="Plin (verificación manual)" />
              <Checkbox name="payment_card_enabled" defaultChecked={s.payment_card_enabled} label="Tarjeta (Mercado Pago)" />
            </div>
            <div className="space-y-4">
              <Field label="Número Yape del comercio" htmlFor="yp"><Input id="yp" name="yape_phone" defaultValue={s.yape_phone ?? ""} /></Field>
              <Field label="Número Plin del comercio" htmlFor="pp"><Input id="pp" name="plin_phone" defaultValue={s.plin_phone ?? ""} /></Field>
              <Field label="Titular de las billeteras" htmlFor="wh"><Input id="wh" name="wallet_holder_name" defaultValue={s.wallet_holder_name ?? ""} /></Field>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Soporte</CardTitle></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Correo de soporte" htmlFor="se"><Input id="se" name="support_email" type="email" defaultValue={s.support_email ?? ""} /></Field>
            <Field label="Teléfono de soporte" htmlFor="sp"><Input id="sp" name="support_phone" defaultValue={s.support_phone ?? ""} /></Field>
          </CardBody>
        </Card>
        <div className="flex justify-end"><Button type="submit" size="lg" loading={pending}>Guardar configuración</Button></div>
      </form>

      <Card>
        <CardHeader><CardTitle>Estado de integraciones</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {integrations.map((i) => (
            <div key={i.label} className="flex items-start justify-between gap-4 rounded-2xl bg-surface-2 p-3 text-sm">
              <div><p className="font-medium">{i.label}</p><p className="text-xs text-muted">{i.hint}</p></div>
              <span className={i.ok ? "font-semibold text-success" : "font-semibold text-warning"}>{i.ok ? "Configurado" : "Pendiente"}</span>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card className="border-danger/40">
        <CardHeader><CardTitle>Datos de demostración</CardTitle></CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-muted">Elimina restaurantes, productos y cupones marcados como demo. Los que ya tengan pedidos reales se suspenden para conservar el historial.</p>
          <ConfirmButton variant="danger" title="¿Eliminar datos de demostración?" description="Esta acción no se puede deshacer." confirmLabel="Eliminar demo" onConfirm={async () => {
            const res = await purgeDemoDataAction();
            if (!res.ok) toast.error(res.error); else { toast.success(res.message); router.refresh(); }
          }}>Eliminar datos demo</ConfirmButton>
        </CardBody>
      </Card>
    </div>
  );
}
