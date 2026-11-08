import { z } from "zod";

const money = z.coerce.number().min(0, "Debe ser mayor o igual a 0").max(100000);
const optionalMoney = z
  .union([z.literal(""), z.coerce.number().min(0).max(100000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));
const optionalNumber = z
  .union([z.literal(""), z.coerce.number().positive().max(100000)])
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
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const optionalUuid = z.union([z.literal(""), z.uuid()]).optional().transform((v) => v || null);
const phone = z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Teléfono inválido")]).optional().transform((v) => v || null);

export const UNIT_VALUES = ["unidad", "kg", "g", "l", "ml", "paquete", "caja", "docena", "bolsa", "lata", "botella", "six pack"] as const;

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Nombre requerido").max(120),
    slug: z.string().trim().regex(/^[a-z0-9-]{2,90}$/, "Slug: solo minúsculas, números y guiones").optional().or(z.literal("")),
    description: z.string().trim().max(500).default(""),
    category_id: z.uuid("Elige una categoría"),
    subcategory_id: optionalUuid,
    brand: optionalText(80),
    sku: z.union([z.literal(""), z.string().trim().regex(/^[A-Za-z0-9._-]{2,40}$/, "SKU: letras, números, punto o guion")]).optional().transform((v) => v || null),
    barcode: z.union([z.literal(""), z.string().trim().regex(/^[0-9]{6,14}$/, "Código de barras: 6 a 14 dígitos")]).optional().transform((v) => v || null),
    cost_price: optionalMoney,
    price: z.coerce.number().min(0.1, "El precio debe ser mayor a 0").max(100000),
    compare_at_price: optionalMoney,
    stock: z.coerce.number().int().min(0).max(1000000).optional(),
    min_stock: z.coerce.number().int().min(0).max(100000).default(5),
    weight: optionalNumber,
    unit: z.enum(UNIT_VALUES),
    is_available: bool,
    is_featured: bool,
    image_url: optionalUrl,
    gallery: z
      .string()
      .default("[]")
      .transform((v, ctx) => {
        try {
          return JSON.parse(v || "[]");
        } catch {
          ctx.addIssue({ code: "custom", message: "Galería inválida" });
          return z.NEVER;
        }
      })
      .pipe(z.array(z.url()).max(8, "Máximo 8 imágenes en la galería")),
  })
  .refine((v) => v.compare_at_price == null || v.compare_at_price > v.price, { path: ["compare_at_price"], message: "El precio anterior debe ser mayor al de venta" });

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(60),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Solo minúsculas, números y guiones"),
  icon: z.string().trim().min(1).max(40).default("shopping-basket"),
  description: z.string().trim().max(300).default(""),
  image_url: optionalUrl,
  parent_id: optionalUuid,
  sort_order: z.coerce.number().int().min(0).max(1000).default(0),
  is_active: bool,
});

export const inventorySchema = z.object({
  product_id: z.uuid("Elige un producto"),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.coerce.number().int().min(0).max(100000),
  reason: z.string().trim().max(200).default(""),
});

export const promotionSchema = z
  .object({
    name: z.string().trim().min(2, "Nombre requerido").max(80),
    description: z.string().trim().max(300).default(""),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.coerce.number().positive("Ingresa el descuento").max(100000),
    scope: z.enum(["product", "category", "order"]),
    product_id: optionalUuid,
    category_id: optionalUuid,
    min_order_amount: money.default(0),
    max_discount: optionalMoney,
    starts_at: z.string().min(1, "Fecha de inicio requerida"),
    ends_at: z.string().optional().transform((v) => v || null),
    usage_limit: z.union([z.literal(""), z.coerce.number().int().min(1)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
    is_active: bool,
    show_on_home: bool,
  })
  .refine((v) => v.discount_type !== "percentage" || v.discount_value <= 90, { path: ["discount_value"], message: "Máximo 90%" })
  .refine((v) => v.scope !== "product" || v.product_id, { path: ["product_id"], message: "Elige el producto" })
  .refine((v) => v.scope !== "category" || v.category_id, { path: ["category_id"], message: "Elige la categoría" });

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "3 a 30 caracteres: letras, números, guion"),
    description: z.string().trim().max(200).default(""),
    discount_type: z.enum(["percentage", "fixed", "free_delivery"]),
    discount_value: money,
    max_discount: optionalMoney,
    min_order_amount: money,
    starts_at: z.string().min(1, "Fecha de inicio requerida"),
    expires_at: z.string().optional().transform((v) => v || null),
    usage_limit: z.union([z.literal(""), z.coerce.number().int().min(1)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
    per_user_limit: z.coerce.number().int().min(1).max(100),
    is_active: bool,
    is_public: bool,
  })
  .refine((v) => v.discount_type !== "percentage" || (v.discount_value >= 1 && v.discount_value <= 100), { path: ["discount_value"], message: "El porcentaje debe estar entre 1 y 100" });

const hourSchema = z.object({
  day: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

export const settingsSchema = z.object({
  business_name: z.string().trim().min(2).max(80),
  slogan: z.string().trim().max(120).default(""),
  logo_url: optionalUrl,
  phone: phone,
  whatsapp: phone,
  email: z.union([z.literal(""), z.email("Correo inválido")]).optional().transform((v) => v || null),
  address: z.string().trim().max(200).default(""),
  district: z.string().trim().max(80).default(""),
  city: z.string().trim().max(80).default("Lima"),
  opening_hours: z
    .string()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v);
      } catch {
        ctx.addIssue({ code: "custom", message: "Horario inválido" });
        return z.NEVER;
      }
    })
    .pipe(z.array(hourSchema).length(7)),
  accepting_orders: bool,
  delivery_enabled: bool,
  pickup_enabled: bool,
  delivery_fee: money,
  free_delivery_threshold: optionalMoney,
  min_order_amount: money,
  delivery_eta: z.string().trim().min(2).max(60),
  welcome_message: z.string().trim().max(300).default(""),
  checkout_message: z.string().trim().max(300).default(""),
  order_confirmation_message: z.string().trim().max(300).default(""),
  support_message: z.string().trim().max(300).default(""),
  facebook_url: optionalUrl,
  instagram_url: optionalUrl,
  tiktok_url: optionalUrl,
  low_stock_default: z.coerce.number().int().min(0).max(1000).default(5),
});

export const paymentMethodSchema = z.object({
  code: z.enum(["cash", "yape", "plin"]),
  is_enabled: bool,
  account_holder: optionalText(80),
  phone_number: phone,
  qr_image_url: optionalUrl,
  instructions: z.string().trim().max(300).default(""),
});

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(60),
  districts: z.string().trim().min(2, "Indica al menos un distrito").transform((v) => v.split(",").map((d) => d.trim()).filter(Boolean)),
  fee: money,
  min_order_amount: optionalMoney,
  eta: optionalText(60),
  is_active: bool,
});
