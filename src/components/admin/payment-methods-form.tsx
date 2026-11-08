"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "./image-upload";
import { useRun } from "./use-run";
import { savePaymentMethodAction } from "@/lib/actions/admin";
import type { PaymentMethodConfig } from "@/types";

function MethodCard({ m }: { m: PaymentMethodConfig }) {
  const { pending, run } = useRun();
  const [enabled, setEnabled] = useState(m.is_enabled);
  const wallet = m.code === "yape" || m.code === "plin";
  return (
    <form className="space-y-4 rounded-3xl border border-border p-5" action={(fd) => void run(() => savePaymentMethodAction(fd))}>
      <input type="hidden" name="code" value={m.code} />
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold">{m.name}</p>
        <Badge tone={m.is_enabled ? "success" : "neutral"}>{m.is_enabled ? "Activo" : "Inactivo"}</Badge>
      </div>
      <Switch name="is_enabled" checked={enabled} onChange={setEnabled} label="Disponible en el checkout" />
      {wallet && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Número ${m.name}`} htmlFor={`ph-${m.code}`}><Input id={`ph-${m.code}`} name="phone_number" defaultValue={m.phone_number ?? ""} inputMode="tel" maxLength={20} className="h-10" /></Field>
          <Field label="Titular" htmlFor={`ah-${m.code}`}><Input id={`ah-${m.code}`} name="account_holder" defaultValue={m.account_holder ?? ""} maxLength={80} className="h-10" /></Field>
        </div>
      )}
      {wallet && <ImageUpload name="qr_image_url" folder="payments" label="Código QR (opcional)" defaultValue={m.qr_image_url} />}
      <Field label="Instrucciones para el cliente" htmlFor={`in-${m.code}`}><Textarea id={`in-${m.code}`} name="instructions" defaultValue={m.instructions} maxLength={300} className="min-h-16" /></Field>
      {wallet && <p className="text-xs text-muted">El cliente adjunta su comprobante y el número de operación. El pedido queda pendiente hasta que verifiques el pago en tu app.</p>}
      <Button type="submit" size="sm" loading={pending}>Guardar {m.name}</Button>
    </form>
  );
}

export function PaymentMethodsForm({ methods }: { methods: PaymentMethodConfig[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {methods.filter((m) => m.code !== "card").map((m) => <MethodCard key={m.code} m={m} />)}
    </div>
  );
}
