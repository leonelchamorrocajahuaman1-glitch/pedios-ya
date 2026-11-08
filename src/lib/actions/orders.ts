"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { checkoutSchema, paymentReportSchema, type CheckoutInput } from "@/lib/validation/checkout";
import { firstError } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

/**
 * Crea el pedido. Precios, promociones, cupón, delivery y stock los calcula y
 * bloquea la base de datos (store_place_order) en una sola transacción; la
 * misma clave de idempotencia nunca genera dos pedidos.
 */
export async function placeOrderAction(input: CheckoutInput): Promise<ActionResult<{ orderId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión para completar tu compra." };
  if (session.profile.status !== "active") return { ok: false, error: "Tu cuenta está suspendida." };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("store_place_order", {
    p_items: d.items,
    p_fulfillment: d.fulfillment,
    p_payment_method: d.payment_method,
    p_idempotency_key: d.idempotency_key,
    p_customer_name: d.customer_name,
    p_contact_phone: d.contact_phone,
    p_address_id: d.fulfillment === "delivery" ? d.address_id : null,
    p_reference: d.reference || null,
    p_coupon_code: d.coupon_code ?? null,
    p_notes: d.notes || null,
  });
  if (error || !data) return { ok: false, error: toUserMessage(error, "No pudimos registrar tu pedido.") };
  revalidatePath("/cuenta/pedidos");
  return { ok: true, data: { orderId: data as string } };
}

/** El cliente registra su operación Yape/Plin y el comprobante (ya subido a su carpeta privada). */
export async function reportPaymentAction(input: { order_id: string; reference: string; proof_path?: string | null }): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión." };
  const parsed = paymentReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (parsed.data.proof_path && !parsed.data.proof_path.startsWith(`${session.userId}/`)) return { ok: false, error: "Comprobante inválido" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("store_report_payment", {
    p_order_id: parsed.data.order_id,
    p_reference: parsed.data.reference,
    p_proof_path: parsed.data.proof_path ?? null,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/pedidos/${parsed.data.order_id}`);
  return { ok: true, message: "Recibimos tu comprobante. Lo verificaremos en breve." };
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId, p_reason: "Cancelado por el cliente" });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true, message: "Pedido cancelado" };
}
