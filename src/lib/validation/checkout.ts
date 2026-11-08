import { z } from "zod";

export const cartItemSchema = z.object({
  product_id: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, "Tu carrito está vacío").max(60),
    fulfillment: z.enum(["delivery", "pickup"], { error: "Elige cómo recibirás tu pedido" }),
    payment_method: z.enum(["cash", "yape", "plin"], { error: "Elige un método de pago" }),
    idempotency_key: z.uuid(),
    customer_name: z.string().trim().min(2, "Ingresa tu nombre").max(120),
    contact_phone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Ingresa un teléfono válido"),
    address_id: z.uuid().optional().nullable(),
    reference: z.string().trim().max(250).optional(),
    coupon_code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Cupón inválido")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.fulfillment === "pickup" || Boolean(v.address_id), { path: ["address_id"], message: "Selecciona una dirección de entrega" });
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const paymentReportSchema = z.object({
  order_id: z.uuid(),
  reference: z.string().trim().regex(/^[0-9A-Za-z-]{4,30}$/, "Ingresa el número de operación que muestra tu app"),
  proof_path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/, "Comprobante inválido")
    .optional()
    .nullable(),
});
