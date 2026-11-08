import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Integración con Mercado Pago (Checkout Pro), disponible en Perú para tarjetas
 * de crédito/débito. Variables requeridas:
 *   MERCADOPAGO_ACCESS_TOKEN   – credencial privada (APP_USR-… o TEST-…)
 *   MERCADOPAGO_WEBHOOK_SECRET – "clave secreta" de la sección Webhooks del panel
 * Un pago SOLO se marca como aprobado cuando el webhook firmado llega y la
 * consulta a la API de Mercado Pago confirma status=approved con el importe exacto.
 */
const API = "https://api.mercadopago.com";

export const isMercadoPagoConfigured = () =>
  Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_WEBHOOK_SECRET);

function token() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado");
  return t;
}

export interface PreferenceInput {
  orderId: string;
  orderCode: string;
  total: number;
  payerEmail?: string | null;
  siteUrl: string;
}

export async function createPreference(input: PreferenceInput): Promise<{ id: string; initPoint: string }> {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pref-${input.orderId}-${Math.round(input.total * 100)}`,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.orderId,
          title: `Pedido ${input.orderCode}`,
          quantity: 1,
          unit_price: Number(input.total.toFixed(2)),
          currency_id: "PEN",
        },
      ],
      external_reference: input.orderId,
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 1 },
      notification_url: `${input.siteUrl}/api/payments/mercadopago/webhook`,
      back_urls: {
        success: `${input.siteUrl}/pedidos/${input.orderId}?pago=procesando`,
        pending: `${input.siteUrl}/pedidos/${input.orderId}?pago=pendiente`,
        failure: `${input.siteUrl}/pedidos/${input.orderId}?pago=fallido`,
      },
      auto_return: "approved",
      statement_descriptor: "MIKUY",
      expires: true,
      expiration_date_to: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Mercado Pago preference error", res.status, body.slice(0, 500));
    throw new Error("No se pudo iniciar el pago con tarjeta. Intenta nuevamente o elige otro método.");
  }
  const json = (await res.json()) as { id: string; init_point: string; sandbox_init_point?: string };
  const useSandbox = token().startsWith("TEST-");
  return { id: json.id, initPoint: useSandbox && json.sandbox_init_point ? json.sandbox_init_point : json.init_point };
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string | null;
  date_approved: string | null;
}

/** Consulta el pago directamente a Mercado Pago (fuente de verdad). */
export async function fetchPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status} al consultar el pago`);
  return (await res.json()) as MercadoPagoPayment;
}

/**
 * Verifica la cabecera x-signature de Mercado Pago:
 *   manifest = "id:{data.id};request-id:{x-request-id};ts:{ts};"
 *   v1 = HMAC_SHA256(secret, manifest)
 */
export function verifyWebhookSignature(params: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  const { signature, requestId, dataId, secret } = params;
  if (!signature || !dataId) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const tolerance = params.toleranceSeconds ?? 60 * 10;
  const tsSeconds = Number(ts) > 1e12 ? Number(ts) / 1000 : Number(ts);
  if (!Number.isFinite(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > tolerance) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
