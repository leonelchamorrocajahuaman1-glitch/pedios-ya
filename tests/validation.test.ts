import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validation/auth";
import { checkoutSchema, paymentReportSchema } from "@/lib/validation/checkout";
import { couponSchema, inventorySchema, productSchema, promotionSchema } from "@/lib/validation/admin";

describe("registro", () => {
  const base = { full_name: "Ana Pérez", email: "ANA@Test.pe ", phone: "987 654 321", password: "segura123", confirm: "segura123", terms: "on" };
  it("acepta datos válidos y normaliza el correo", () => {
    const r = registerSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("ana@test.pe");
  });
  it("no acepta campos de rol (se descartan)", () => {
    const r = registerSchema.safeParse({ ...base, role: "admin" });
    expect(r.success && "role" in r.data).toBe(false);
  });
  it("exige contraseñas iguales, con letras y números", () => {
    expect(registerSchema.safeParse({ ...base, confirm: "otra1234" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "solotexto", confirm: "solotexto" }).success).toBe(false);
  });
  it("exige aceptar términos", () => {
    expect(registerSchema.safeParse({ ...base, terms: undefined }).success).toBe(false);
  });
});

describe("checkout", () => {
  const ok = {
    items: [{ product_id: "4f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b", quantity: 2 }],
    fulfillment: "delivery",
    address_id: "5f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b",
    payment_method: "yape",
    customer_name: "Rosa Quispe",
    contact_phone: "+51 987 654 321",
    idempotency_key: "6f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b",
  };
  it("acepta un pedido válido (sin importes: los calcula la BD)", () => {
    expect(checkoutSchema.safeParse(ok).success).toBe(true);
  });
  it("rechaza cantidades fuera de rango, tarjeta y métodos desconocidos", () => {
    expect(checkoutSchema.safeParse({ ...ok, items: [{ ...ok.items[0], quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, payment_method: "card" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, payment_method: "bitcoin" }).success).toBe(false);
  });
  it("exige dirección solo para delivery", () => {
    expect(checkoutSchema.safeParse({ ...ok, address_id: undefined }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, fulfillment: "pickup", address_id: undefined }).success).toBe(true);
  });
  it("normaliza cupones a mayúsculas", () => {
    const r = checkoutSchema.safeParse({ ...ok, coupon_code: "bienvenida10" });
    expect(r.success && r.data.coupon_code).toBe("BIENVENIDA10");
  });
  it("valida el número de operación y la ruta del comprobante", () => {
    const base = { order_id: ok.idempotency_key, reference: "12345678" };
    expect(paymentReportSchema.safeParse(base).success).toBe(true);
    expect(paymentReportSchema.safeParse({ ...base, reference: "12" }).success).toBe(false);
    expect(paymentReportSchema.safeParse({ ...base, proof_path: `${ok.idempotency_key}/comprobante.jpg` }).success).toBe(true);
    expect(paymentReportSchema.safeParse({ ...base, proof_path: "../otro/archivo.jpg" }).success).toBe(false);
  });
});

describe("admin", () => {
  it("valida porcentaje de cupones entre 1 y 100", () => {
    const c = { code: "promo", discount_type: "percentage", discount_value: "150", min_order_amount: "0", starts_at: "2026-11-01T10:00", per_user_limit: "1" };
    expect(couponSchema.safeParse(c).success).toBe(false);
    expect(couponSchema.safeParse({ ...c, discount_value: "20" }).success).toBe(true);
  });
  const p = { name: "Arroz extra 5 kg", category_id: "3f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b", price: "24.90", unit: "bolsa", stock: "10", min_stock: "3" };
  it("valida productos, precios anteriores y galería", () => {
    expect(productSchema.safeParse(p).success).toBe(true);
    expect(productSchema.safeParse({ ...p, compare_at_price: "20" }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, compare_at_price: "29.90" }).success).toBe(true);
    expect(productSchema.safeParse({ ...p, gallery: '["https://x.test/a.jpg"]' }).success).toBe(true);
    expect(productSchema.safeParse({ ...p, gallery: "{malo" }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, gallery: JSON.stringify(Array(9).fill("https://x.test/a.jpg")) }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, barcode: "12ab" }).success).toBe(false);
  });
  it("exige motivo válido y cantidad entera en inventario", () => {
    const m = { product_id: p.category_id, type: "in", quantity: "5", reason: "" };
    expect(inventorySchema.safeParse(m).success).toBe(true);
    expect(inventorySchema.safeParse({ ...m, quantity: "1.5" }).success).toBe(false);
    expect(inventorySchema.safeParse({ ...m, type: "sale" }).success).toBe(false);
  });
  it("valida el alcance de las promociones", () => {
    const pr = { name: "Semana del snack", discount_type: "percentage", discount_value: "15", scope: "category", starts_at: "2026-11-01T00:00" };
    expect(promotionSchema.safeParse(pr).success).toBe(false);
    expect(promotionSchema.safeParse({ ...pr, category_id: p.category_id }).success).toBe(true);
    expect(promotionSchema.safeParse({ ...pr, category_id: p.category_id, discount_value: "95" }).success).toBe(false);
  });
});
