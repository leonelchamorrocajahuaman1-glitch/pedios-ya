"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/checkout";
import { firstError } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import { createPreference, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { env } from "@/lib/env";
import type { ActionResult } from "@/types";

export type PlaceOrderResult = ActionResult<{ orderId: string; redirectTo: string }>;

/**
 * Crea el pedido. Los importes los calcula la base de datos (place_order),
 * con validación de stock, cupón, zona de reparto y horario, de forma atómica
 * e idempotente (la misma clave nunca genera dos pedidos).
 */
export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión para completar tu pedido." };
  if (session.profile.status !== "active") return { ok: false, error: "Tu cuenta está suspendida." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  if (d.payment_method === "card" && !isMercadoPagoConfigured()) {
    return { ok: false, error: "El pago con tarjeta aún no está habilitado. Elige otro método." };
  }

  const notes = [d.notes, d.payment_method === "cash" && d.cash_change_for ? `Pagará con S/ ${d.cash_change_for.toFixed(2)}` : null]
    .filter(Boolean)
    .join(" · ");

  const supabase = await createSupabaseServerClient();
  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_restaurant_id: d.restaurant_id,
    p_items: d.items,
    p_address_id: d.address_id,
    p_payment_method: d.payment_method,
    p_idempotency_key: d.idempotency_key,
    p_coupon_code: d.coupon_code ?? null,
    p_notes: notes || null,
    p_reference: d.reference || null,
    p_contact_phone: d.contact_phone || null,
  });
  if (error || !orderId) return { ok: false, error: toUserMessage(error, "No pudimos crear tu pedido.") };

  if (d.payment_method === "card") {
    const pay = await startCardPayment(orderId as string);
    if (!pay.ok) return { ok: true, data: { orderId: orderId as string, redirectTo: `/pedidos/${orderId}?pago=error` } };
    return { ok: true, data: { orderId: orderId as string, redirectTo: pay.data!.url } };
  }
  return { ok: true, data: { orderId: orderId as string, redirectTo: `/pedidos/${orderId}?nuevo=1` } };
}

/** Genera (o regenera) el enlace de pago con tarjeta para un pedido propio pendiente. */
export async function startCardPayment(orderId: string): Promise<ActionResult<{ url: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión." };
  if (!isMercadoPagoConfigured()) return { ok: false, error: "El pago con tarjeta no está configurado." };

  const supabase = await createSupabaseServerClient();
  // RLS garantiza que solo se lee si el pedido es del usuario
  const { data: order } = await supabase
    .from("orders")
    .select("id, code, total, status, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.payment_method !== "card") return { ok: false, error: "Este pedido no se paga con tarjeta." };
  if (order.status === "cancelled" || order.payment_status === "approved") {
    return { ok: false, error: "Este pedido ya no admite pagos." };
  }

  try {
    const pref = await createPreference({
      orderId: order.id,
      orderCode: order.code,
      total: Number(order.total),
      payerEmail: session.profile.email,
      siteUrl: env.siteUrl,
    });
    const service = getSupabaseServiceClient();
    await service
      .from("payments")
      .update({ provider_preference_id: pref.id })
      .eq("order_id", order.id)
      .eq("method", "card")
      .in("status", ["pending", "rejected"]);
    return { ok: true, data: { url: pref.initPoint } };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}
