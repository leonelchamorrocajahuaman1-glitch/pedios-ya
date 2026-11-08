import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validation/auth";
import { checkoutSchema } from "@/lib/validation/checkout";
import { couponSchema, productSchema } from "@/lib/validation/admin";

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
    restaurant_id: "3f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b",
    items: [{ product_id: "4f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b", quantity: 2, options: [] }],
    address_id: "5f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b",
    payment_method: "yape",
    idempotency_key: "6f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b",
  };
  it("acepta un pedido válido (sin importes: los calcula la BD)", () => {
    expect(checkoutSchema.safeParse(ok).success).toBe(true);
  });
  it("rechaza cantidades fuera de rango y métodos desconocidos", () => {
    expect(checkoutSchema.safeParse({ ...ok, items: [{ ...ok.items[0], quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, payment_method: "bitcoin" }).success).toBe(false);
  });
  it("normaliza cupones a mayúsculas", () => {
    const r = checkoutSchema.safeParse({ ...ok, coupon_code: "bienvenido20" });
    expect(r.success && r.data.coupon_code).toBe("BIENVENIDO20");
  });
});

describe("admin", () => {
  it("valida porcentaje de cupones entre 1 y 100", () => {
    const c = { code: "promo", discount_type: "percentage", discount_value: "150", min_order_amount: "0", starts_at: "2026-11-01T10:00", per_user_limit: "1" };
    expect(couponSchema.safeParse(c).success).toBe(false);
    expect(couponSchema.safeParse({ ...c, discount_value: "20" }).success).toBe(true);
  });
  it("valida el JSON de opciones de productos", () => {
    const p = { restaurant_id: "3f1c2a0e-8b7d-4c6e-9a1b-2c3d4e5f6a7b", section: "Menú", name: "Burger", price: "20", options: "[{\"name\":\"Tamaño\",\"required\":true,\"max\":1,\"choices\":[{\"name\":\"Grande\",\"price\":3}]}]" };
    expect(productSchema.safeParse(p).success).toBe(true);
    expect(productSchema.safeParse({ ...p, options: "{malo" }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, options: "[{\"name\":\"X\",\"required\":true,\"max\":1,\"choices\":[]}]" }).success).toBe(false);
  });
});
