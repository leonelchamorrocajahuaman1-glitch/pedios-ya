import { z } from "zod";

const money = z.coerce.number().min(0, "Debe ser mayor o igual a 0").max(100000);
const optionalMoney = z
  .union([z.literal(""), z.coerce.number().min(0).max(100000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));
const optionalInt = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(1000000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));
const bool = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");
const optionalUrl = z
  .union([z.literal(""), z.url("URL inválida")])
  .optional()
  .transform((v) => v || null);
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida");

export const optionGroupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  required: z.boolean(),
  max: z.number().int().min(1).max(10),
  choices: z
    .array(z.object({ name: z.string().trim().min(1).max(60), price: z.number().min(0).max(1000) }))
    .min(1, "Cada grupo necesita al menos una opción")
    .max(20),
});

export const restaurantSchema = z
  .object({
    name: z.string().trim().min(2, "Nombre requerido").max(100),
    slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/, "Solo minúsculas, números y guiones"),
    description: z.string().trim().max(600).default(""),
    logo_url: optionalUrl,
    cover_url: optionalUrl,
    phone: z.string().trim().max(20).optional().transform((v) => v || null),
    email: z.union([z.literal(""), z.email("Correo inválido")]).optional().transform((v) => v || null),
    address: z.string().trim().min(3, "Dirección requerida").max(200),
    district: z.string().trim().max(80).default(""),
    lat: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
    lng: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
    delivery_time_min: z.coerce.number().int().min(5).max(180),
    delivery_time_max: z.coerce.number().int().min(5).max(240),
    delivery_fee: money,
    min_order_amount: money,
    commission_rate: z.coerce.number().min(0).max(50).transform((v) => v / 100),
    opens_at: time,
    closes_at: time,
    open_days: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Elige al menos un día"),
    is_accepting_orders: bool,
    is_featured: bool,
    status: z.enum(["pending", "approved", "suspended", "rejected"]),
    category_ids: z.array(z.uuid()).default([]),
  })
  .refine((v) => v.delivery_time_max >= v.delivery_time_min, {
    path: ["delivery_time_max"],
    message: "Debe ser mayor o igual al tiempo mínimo",
  });

export const productSchema = z.object({
  restaurant_id: z.uuid("Selecciona un restaurante"),
  category_id: z.union([z.literal(""), z.uuid()]).optional().transform((v) => v || null),
  section: z.string().trim().min(1, "Sección requerida").max(60),
  name: z.string().trim().min(2, "Nombre requerido").max(120),
  description: z.string().trim().max(500).default(""),
  image_url: optionalUrl,
  price: money,
  compare_at_price: optionalMoney,
  stock: optionalInt,
  is_available: bool,
  is_popular: bool,
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  options: z
    .string()
    .default("[]")
    .transform((v, ctx) => {
      try {
        return JSON.parse(v || "[]");
      } catch {
        ctx.addIssue({ code: "custom", message: "Opciones con formato inválido" });
        return z.NEVER;
      }
    })
    .pipe(z.array(optionGroupSchema).max(10)),
});

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "3 a 30 caracteres: letras, números, guion"),
    description: z.string().trim().max(200).default(""),
    discount_type: z.enum(["percentage", "fixed", "free_delivery"]),
    discount_value: money,
    max_discount: optionalMoney,
    min_order_amount: money,
    starts_at: z.string().min(1, "Fecha de inicio requerida"),
    expires_at: z.string().optional().transform((v) => v || null),
    usage_limit: optionalInt,
    per_user_limit: z.coerce.number().int().min(1).max(100),
    restaurant_id: z.union([z.literal(""), z.uuid()]).optional().transform((v) => v || null),
    is_active: bool,
    is_public: bool,
  })
  .refine((v) => v.discount_type !== "percentage" || (v.discount_value >= 1 && v.discount_value <= 100), {
    path: ["discount_value"],
    message: "El porcentaje debe estar entre 1 y 100",
  })
  .refine((v) => !v.expires_at || new Date(v.expires_at) > new Date(v.starts_at), {
    path: ["expires_at"],
    message: "Debe ser posterior a la fecha de inicio",
  });

export const courierSchema = z.object({
  full_name: z.string().trim().min(3, "Nombre requerido").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Teléfono inválido"),
  document_id: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{6,15}$/, "Documento inválido (DNI/CE)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  vehicle_type: z.enum(["moto", "bicicleta", "auto", "a_pie"]),
  vehicle_plate: z.string().trim().max(12).optional().transform((v) => v || null),
  status: z.enum(["pending", "active", "suspended"]),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Solo minúsculas, números y guiones"),
  icon: z.string().trim().min(1).max(40).default("utensils"),
  image_url: optionalUrl,
  sort_order: z.coerce.number().int().min(0).max(1000).default(0),
  is_active: bool,
});

export const settingsSchema = z.object({
  platform_name: z.string().trim().min(2).max(40),
  logo_url: optionalUrl,
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal (#RRGGBB)"),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal (#RRGGBB)"),
  default_commission_rate: z.coerce.number().min(0).max(50).transform((v) => v / 100),
  base_delivery_fee: money,
  fee_per_km: money,
  included_km: z.coerce.number().min(0).max(50),
  max_delivery_km: z.coerce.number().min(1).max(100),
  free_delivery_threshold: optionalMoney,
  service_fee: money,
  payment_cash_enabled: bool,
  payment_yape_enabled: bool,
  payment_plin_enabled: bool,
  payment_card_enabled: bool,
  yape_phone: z.string().trim().max(20).optional().transform((v) => v || null),
  plin_phone: z.string().trim().max(20).optional().transform((v) => v || null),
  wallet_holder_name: z.string().trim().max(80).optional().transform((v) => v || null),
  support_email: z.union([z.literal(""), z.email()]).optional().transform((v) => v || null),
  support_phone: z.string().trim().max(20).optional().transform((v) => v || null),
});
