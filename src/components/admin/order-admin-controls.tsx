"use client";

import { useState } from "react";
import { ExternalLink, FileImage } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/input";
import { getProofUrlAction, reviewPaymentAction, setDeliveryPersonAction, setOrderStatusAction } from "@/lib/actions/admin";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, nextStatus } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";
import { useRun } from "./use-run";
import type { Order, Payment } from "@/types";

function ProofButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const res = await getProofUrlAction(path);
        setLoading(false);
        if (!res.ok) return void toast.error(res.error);
        window.open(res.data!.url, "_blank", "noopener,noreferrer");
      }}
    >
      <FileImage className="h-4 w-4" /> Ver comprobante <ExternalLink className="h-3.5 w-3.5" />
    </Button>
  );
}

export function OrderAdminControls({ order, payments }: { order: Order; payments: Payment[] }) {
  const { pending, run } = useRun();
  const [note, setNote] = useState("");
  const [person, setPerson] = useState({ name: order.delivery_person_name ?? "", phone: order.delivery_person_phone ?? "" });
  const closed = order.status === "delivered" || order.status === "cancelled";
  const next = nextStatus(order.status, order.fulfillment);
  const wallet = order.payment_method === "yape" || order.payment_method === "plin";
  const needsPaymentFirst = wallet && order.status === "received" && order.payment_status !== "approved";

  return (
    <div className="space-y-6">
      {!closed && (
        <section className="space-y-3">
          <h3 className="font-semibold">Estado del pedido</h3>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para el historial (opcional)" maxLength={300} className="h-10" />
          <div className="flex flex-wrap gap-2">
            {next && (
              <Button loading={pending} disabled={needsPaymentFirst} onClick={() => run(() => setOrderStatusAction(order.id, next, note)).then((ok) => ok && setNote(""))}>
                Pasar a «{ORDER_STATUS_LABEL[next]}»
              </Button>
            )}
            <ConfirmButton
              variant="danger"
              title="¿Cancelar este pedido?"
              description="Se repondrá el stock de los productos, se liberará el cupón y se anularán los pagos pendientes. Si el cliente ya pagó por Yape o Plin, coordina la devolución con él."
              confirmLabel="Cancelar pedido"
              onConfirm={() => run(() => setOrderStatusAction(order.id, "cancelled", note || "Cancelado por la tienda"))}
            >
              Cancelar pedido
            </ConfirmButton>
          </div>
          {needsPaymentFirst && <p className="text-xs text-warning">Verifica primero el pago {PAYMENT_METHOD_LABEL[order.payment_method]} para poder confirmar el pedido.</p>}
        </section>
      )}

      {!closed && (
        <section className="space-y-3">
          <h3 className="font-semibold">{order.fulfillment === "pickup" ? "Encargado de entregar en tienda" : "Encargado del delivery"}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="dpn"><Input id="dpn" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} maxLength={80} className="h-10" /></Field>
            <Field label="Teléfono" htmlFor="dpp"><Input id="dpp" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} maxLength={20} inputMode="tel" className="h-10" /></Field>
          </div>
          <Button size="sm" variant="secondary" loading={pending} disabled={person.name.trim().length < 2} onClick={() => run(() => setDeliveryPersonAction(order.id, person.name, person.phone))}>
            Guardar encargado
          </Button>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold">Pagos</h3>
        {payments.length === 0 && <p className="text-sm text-muted">Sin registros de pago.</p>}
        {payments.map((p) => (
          <div key={p.id} className="space-y-2 rounded-2xl border border-border p-4 text-sm">
            <div className="flex justify-between gap-2"><span>{PAYMENT_METHOD_LABEL[p.method]} · {formatPEN(p.amount)}</span><strong>{PAYMENT_STATUS_LABEL[p.status]}</strong></div>
            {p.operation_number && <p className="text-muted">N° de operación: <span className="font-mono text-fg">{p.operation_number}</span>{p.payer_phone && ` · desde ${p.payer_phone}`}</p>}
            {p.review_note && <p className="text-xs text-muted">Nota: {p.review_note}</p>}
            {p.confirmed_at && <p className="text-xs text-muted">Revisado: {formatDateTime(p.confirmed_at)}</p>}
            {p.proof_path && <ProofButton path={p.proof_path} />}
            {p.method !== "cash" && p.status === "pending" && !p.operation_number && <p className="text-xs text-muted">El cliente aún no envía su comprobante.</p>}
            {["pending", "pending_verification"].includes(p.status) && order.status !== "cancelled" && (
              <div className="flex flex-wrap gap-2 pt-1">
                <ConfirmButton
                  variant="success"
                  size="sm"
                  title="Confirmar pago"
                  description={p.method === "cash"
                    ? "Confirma solo cuando hayas recibido el efectivo."
                    : `Revisa en tu app ${PAYMENT_METHOD_LABEL[p.method]} que la operación ${p.operation_number ?? ""} por ${formatPEN(p.amount)} fue recibida. No confíes solo en la captura.`}
                  confirmLabel="Confirmar pago"
                  onConfirm={() => run(() => reviewPaymentAction(p.id, true, p.method === "cash" ? "Efectivo recibido" : "Operación verificada"))}
                >
                  Confirmar recibido
                </ConfirmButton>
                {p.method !== "cash" && (
                  <ConfirmButton variant="outline" size="sm" title="Rechazar pago" description="El cliente verá el rechazo y podrá enviar otro comprobante." confirmLabel="Rechazar" onConfirm={() => run(() => reviewPaymentAction(p.id, false, "No se encontró la operación o el monto no coincide"))}>
                    Rechazar
                  </ConfirmButton>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
