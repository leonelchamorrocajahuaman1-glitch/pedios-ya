import { NextResponse, type NextRequest } from "next/server";
import { fetchPayment, verifyWebhookSignature } from "@/lib/payments/mercadopago";
import { getSupabaseServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Webhook de Mercado Pago. Flujo seguro:
 * 1. Verifica la firma HMAC (x-signature) con MERCADOPAGO_WEBHOOK_SECRET.
 * 2. Consulta el pago en la API de Mercado Pago (no confía en el cuerpo recibido).
 * 3. Aplica el resultado con apply_card_payment (solo service_role), que valida
 *    el importe contra el total del pedido y es idempotente.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const url = request.nextUrl;
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    /* algunas notificaciones llegan solo con query params */
  }
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);

  const valid = verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret,
  });
  if (!valid) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });

  if (type !== "payment" || !dataId) return NextResponse.json({ received: true, ignored: true });

  try {
    const payment = await fetchPayment(dataId);
    if (!payment.external_reference || payment.currency_id !== "PEN") {
      return NextResponse.json({ received: true, ignored: "sin referencia o moneda distinta" });
    }
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("apply_card_payment", {
      p_order_id: payment.external_reference,
      p_provider_payment_id: String(payment.id),
      p_status: payment.status,
      p_amount: payment.transaction_amount,
      p_raw: {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        amount: payment.transaction_amount,
        date_approved: payment.date_approved,
      },
    });
    if (error) throw error;
    return NextResponse.json({ received: true, result: data });
  } catch (e) {
    console.error("Webhook Mercado Pago", e);
    // 500 => Mercado Pago reintentará la notificación
    return NextResponse.json({ error: "Error procesando el pago" }, { status: 500 });
  }
}
