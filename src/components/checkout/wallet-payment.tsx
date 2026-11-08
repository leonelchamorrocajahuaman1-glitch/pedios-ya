"use client";

import { useRef } from "react";
import { FileImage, Smartphone, Upload, X } from "lucide-react";
import type { PaymentMethodConfig } from "@/types";
import { Field, Input } from "@/components/ui/input";
import { SmartImage } from "@/components/ui/smart-image";
import { formatPEN } from "@/lib/format";

export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const PROOF_MAX = 5 * 1024 * 1024;

/** Datos Yape/Plin del negocio + número de operación + comprobante. */
export function WalletPayment({
  method,
  total,
  reference,
  onReference,
  file,
  onFile,
}: {
  method: PaymentMethodConfig;
  total: number | null;
  reference: string;
  onReference: (v: string) => void;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const color = method.code === "yape" ? "bg-[#742284]" : "bg-[#00a3b4]";
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface-2/60 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`flex flex-1 items-center gap-3 rounded-2xl ${color} p-4 text-white`}>
          <Smartphone className="h-8 w-8 shrink-0" />
          <div>
            <p className="text-xs opacity-80">{method.name} al número</p>
            <p className="font-display text-2xl font-bold tracking-wider">{method.phone_number ?? "No configurado"}</p>
            {method.account_holder && <p className="text-xs opacity-90">A nombre de {method.account_holder}</p>}
          </div>
        </div>
        {method.qr_image_url && (
          <div className="relative h-32 w-32 shrink-0 self-center overflow-hidden rounded-2xl border border-border bg-white">
            <SmartImage src={method.qr_image_url} alt={`QR de ${method.name}`} fill sizes="128px" className="object-contain" />
          </div>
        )}
      </div>
      <p className="text-sm text-muted">
        {method.instructions} {total != null && <>Monto exacto a pagar: <strong className="text-fg">{formatPEN(total)}</strong>.</>}
      </p>
      <Field label="Número de operación" htmlFor="op" hint="Aparece en tu app luego de pagar.">
        <Input id="op" value={reference} onChange={(e) => onReference(e.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 30))} inputMode="numeric" placeholder="Ej. 12345678" />
      </Field>
      <div className="space-y-2">
        <span className="text-sm font-medium">Comprobante (captura de pantalla)</span>
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="flex min-w-0 items-center gap-2"><FileImage className="h-4 w-4 shrink-0 text-brand" /><span className="truncate">{file.name}</span></span>
            <button type="button" onClick={() => onFile(null)} className="text-muted hover:text-danger" aria-label="Quitar archivo"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-5 text-sm font-medium text-muted transition hover:border-brand hover:text-brand">
            <Upload className="h-4 w-4" /> Adjuntar comprobante (JPG, PNG, WebP o PDF · máx. 5 MB)
          </button>
        )}
        <input ref={input} type="file" accept={PROOF_TYPES.join(",")} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </div>
      <p className="text-xs text-muted">Tu pago quedará <strong>por verificar</strong> hasta que confirmemos la operación. No marcamos ningún pago como realizado sin revisarlo.</p>
    </div>
  );
}
