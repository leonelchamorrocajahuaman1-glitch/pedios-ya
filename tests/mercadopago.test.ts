import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/payments/mercadopago";

const secret = "test-secret";
function sign(dataId: string, requestId: string, ts: number) {
  const v1 = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyWebhookSignature (Mercado Pago)", () => {
  const now = Math.floor(Date.now() / 1000);
  it("acepta una firma válida", () => {
    expect(verifyWebhookSignature({ signature: sign("123456", "req-1", now), requestId: "req-1", dataId: "123456", secret })).toBe(true);
  });
  it("rechaza si cambia el id del pago", () => {
    expect(verifyWebhookSignature({ signature: sign("123456", "req-1", now), requestId: "req-1", dataId: "999999", secret })).toBe(false);
  });
  it("rechaza si la clave secreta es otra", () => {
    expect(verifyWebhookSignature({ signature: sign("1", "r", now), requestId: "r", dataId: "1", secret: "otra" })).toBe(false);
  });
  it("rechaza firmas antiguas (replay)", () => {
    expect(verifyWebhookSignature({ signature: sign("1", "r", now - 3600), requestId: "r", dataId: "1", secret })).toBe(false);
  });
  it("rechaza cabeceras ausentes o mal formadas", () => {
    expect(verifyWebhookSignature({ signature: null, requestId: "r", dataId: "1", secret })).toBe(false);
    expect(verifyWebhookSignature({ signature: "basura", requestId: "r", dataId: "1", secret })).toBe(false);
  });
});
