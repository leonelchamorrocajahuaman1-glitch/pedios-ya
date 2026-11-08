import { z } from "zod";

export const cartItemSchema = z.object({
  product_id: z.uuid(),
  quantity: z.number().int().min(1).max(50),
  options: z.array(z.object({ group: z.string().max(80), choice: z.string().max(80) })).max(20).default([]),
  notes: z.string().max(200).optional(),
});

export const checkoutSchema = z.object({
  restaurant_id: z.uuid(),
  items: z.array(cartItemSchema).min(1, "Tu carrito está vacío").max(40),
  address_id: z.uuid("Selecciona una dirección de entrega"),
  payment_method: z.enum(["cash", "yape", "plin", "card"], { error: "Elige un método de pago" }),
  idempotency_key: z.uuid(),
  coupon_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Cupón inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(300).optional(),
  reference: z.string().trim().max(250).optional(),
  contact_phone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Teléfono inválido").optional().or(z.literal("")),
  cash_change_for: z.number().min(0).max(2000).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const walletPaymentSchema = z.object({
  order_id: z.uuid(),
  operation_number: z.string().trim().regex(/^[0-9A-Za-z-]{4,30}$/, "Ingresa el número de operación que muestra tu app"),
  payer_phone: z.string().trim().max(20).optional(),
});
