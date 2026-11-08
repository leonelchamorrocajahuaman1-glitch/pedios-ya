"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input, Select } from "@/components/ui/input";
import { assignCourierAction, reviewPaymentAction, updateOrderStatusAction } from "@/lib/actions/admin";
import { ORDER_FLOW, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import type { Courier, Order, Payment } from "@/types";

export function OrderAdminControls({ order, couriers, payments }: { order: Order; couriers: Pick<Courier, "id" | "full_name" | "is_available" | "vehicle_type">[]; payments: Payment[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [courierId, setCourierId] = useState(order.courier_id ?? "");
  const [note, setNote] = useState("");
  const closed = order.status === "delivered" || order.status === "cancelled";
  const idx = ORDER_FLOW.indexOf(order.status);
  const next = idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message ?? "Listo");
        router.refresh();
      }
    });

  return (
    <div className="space-y-6">
      {!closed && (
        <section className="space-y-3">
          <h3 className="font-semibold">Estado del pedido</h3>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota interna (opcional)" maxLength={300} className="h-10" />
          <div className="flex flex-wrap gap-2">
            {next && next !== "courier_assigned" && (
              <Button loading={pending} onClick={() => run(() => updateOrderStatusAction(order.id, next, note))}>Pasar a «{ORDER_STATUS_LABEL[next]}»</Button>
            )}
            <ConfirmButton
              variant="danger"
              title="¿Cancelar este pedido?"
              description="Se repondrá el stock, se liberará el cupón y se anularán los pagos pendientes. Si el pago ya fue aprobado deberás gestionar el reembolso en la pasarela."
              confirmLabel="Cancelar pedido"
              onConfirm={() => run(() => updateOrderStatusAction(order.id, "cancelled", note || "Cancelado por administración"))}
            >
              Cancelar pedido
            </ConfirmButton>
          </div>
          {order.payment_method === "card" && order.payment_status !== "approved" && order.status === "received" && (
            <p className="text-xs text-warning">El pedido con tarjeta solo puede aceptarse cuando Mercado Pago confirme el pago.</p>
          )}
        </section>
      )}

      {["accepted", "preparing", "courier_assigned"].includes(order.status) && (
        <section className="space-y-3">
          <h3 className="font-semibold">Repartidor</h3>
          <div className="flex gap-2">
            <Select value={courierId} onChange={(e) => setCourierId(e.target.value)} className="h-10">
              <option value="">Selecciona un repartidor</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {c.vehicle_type}{c.is_available ? " · disponible" : ""}</option>)}
            </Select>
            <Button variant="secondary" disabled={!courierId} loading={pending} onClick={() => run(() => assignCourierAction(order.id, courierId))}>Asignar</Button>
          </div>
          {couriers.length === 0 && <p className="text-xs text-muted">No hay repartidores activos. Regístralos en «Repartidores».</p>}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold">Pagos</h3>
        {payments.length === 0 && <p className="text-sm text-muted">Sin registros de pago.</p>}
        {payments.map((p) => (
          <div key={p.id} className="space-y-2 rounded-2xl border border-border p-4 text-sm">
            <div className="flex justify-between"><span>{PAYMENT_METHOD_LABEL[p.method]} · {p.provider}</span><strong>{PAYMENT_STATUS_LABEL[p.status]}</strong></div>
            {p.operation_number && <p className="text-muted">N° operación: <span className="font-mono text-fg">{p.operation_number}</span>{p.payer_phone && ` · desde ${p.payer_phone}`}</p>}
            {p.provider_payment_id && <p className="text-muted">ID pasarela: <span className="font-mono">{p.provider_payment_id}</span></p>}
            {p.method !== "card" && ["pending", "pending_verification"].includes(p.status) && (
              <div className="flex flex-wrap gap-2 pt-1">
                <ConfirmButton
                  variant="success"
                  size="sm"
                  title="Confirmar pago"
                  description={p.method === "cash" ? "Confirma solo cuando el repartidor haya entregado el efectivo." : `Verifica en tu app ${PAYMENT_METHOD_LABEL[p.method]} que la operación ${p.operation_number ?? ""} por el monto exacto fue recibida.`}
                  confirmLabel="Confirmar pago"
                  onConfirm={() => run(() => reviewPaymentAction(p.id, true))}
                >
                  Confirmar recibido
                </ConfirmButton>
                <ConfirmButton variant="outline" size="sm" title="Rechazar pago" description="El cliente será notificado para volver a enviar su comprobante." confirmLabel="Rechazar" onConfirm={() => run(() => reviewPaymentAction(p.id, false, "No se encontró la operación"))}>
                  Rechazar
                </ConfirmButton>
              </div>
            )}
            {p.method === "card" && p.status !== "approved" && <p className="text-xs text-muted">Se confirma automáticamente vía webhook de Mercado Pago.</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
