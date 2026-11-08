"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateCourierToken } from "@/lib/courier";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { categorySchema, couponSchema, courierSchema, productSchema, restaurantSchema, settingsSchema } from "@/lib/validation/admin";
import { firstError } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import { env } from "@/lib/env";
import type { AccountStatus, ActionResult, OrderStatus, RestaurantStatus } from "@/types";

/**
 * Todas las acciones administrativas:
 * 1) verifican en el servidor que el usuario sea admin activo (perfil en BD);
 * 2) usan el cliente con la sesión del usuario, por lo que RLS vuelve a exigir is_admin();
 * 3) quedan registradas en admin_audit_logs (triggers y funciones de la BD).
 */
/** "2026-11-07T10:00" (hora de Lima, sin zona) → ISO UTC. Perú no usa horario de verano. */
function limaToISO(value: string) {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.length === 16 ? `${value}:00` : value}-05:00`).toISOString();
}

const FORBIDDEN: ActionResult<never> = { ok: false, error: "No autorizado" };
const uuid = z.uuid();

async function adminClient() {
  const session = await assertAdmin();
  if (!session) return null;
  return { session, supabase: await createSupabaseServerClient() };
}

function fail(error: unknown): ActionResult<never> {
  return { ok: false, error: toUserMessage(error) };
}

// ---------------------------------------------------------------- Pedidos
export async function updateOrderStatusAction(orderId: string, status: OrderStatus, note?: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Pedido inválido" };
  const { error } = await ctx.supabase.rpc("admin_update_order_status", { p_order_id: orderId, p_status: status, p_note: note?.slice(0, 300) || null });
  if (error) return fail(error);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Estado actualizado" };
}

export async function assignCourierAction(orderId: string, courierId: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  if (!uuid.safeParse(orderId).success || !uuid.safeParse(courierId).success) return { ok: false, error: "Datos inválidos" };
  const { error } = await ctx.supabase.rpc("admin_assign_courier", { p_order_id: orderId, p_courier_id: courierId });
  if (error) return fail(error);
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true, message: "Repartidor asignado" };
}

export async function reviewPaymentAction(paymentId: string, approve: boolean, note?: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.rpc("admin_review_payment", { p_payment_id: paymentId, p_approve: approve, p_note: note?.slice(0, 200) || null });
  if (error) return fail(error);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  return { ok: true, message: approve ? "Pago confirmado" : "Pago rechazado" };
}

// ---------------------------------------------------------------- Restaurantes
export async function saveRestaurantAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = restaurantSchema.safeParse({
    ...Object.fromEntries(formData),
    open_days: formData.getAll("open_days"),
    category_ids: formData.getAll("category_ids"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { category_ids, ...data } = parsed.data;
  const id = formData.get("id");
  const { data: row, error } =
    typeof id === "string" && id
      ? await ctx.supabase.from("restaurants").update(data).eq("id", id).select("id").single()
      : await ctx.supabase.from("restaurants").insert(data).select("id").single();
  if (error) return fail(error);
  const rid = row.id as string;
  await ctx.supabase.from("restaurant_categories").delete().eq("restaurant_id", rid);
  if (category_ids.length) {
    const { error: e2 } = await ctx.supabase.from("restaurant_categories").insert(category_ids.map((c) => ({ restaurant_id: rid, category_id: c })));
    if (e2) return fail(e2);
  }
  revalidatePath("/admin/restaurantes");
  revalidatePath("/");
  return { ok: true, data: { id: rid }, message: "Restaurante guardado" };
}

export async function setRestaurantStatusAction(id: string, status: RestaurantStatus): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("restaurants").update({ status }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/restaurantes");
  return { ok: true, message: "Estado actualizado" };
}

export async function deleteRestaurantAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { count } = await ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", id);
  if (count) return { ok: false, error: "Tiene pedidos registrados: suspéndelo en lugar de eliminarlo para conservar el historial." };
  const { error } = await ctx.supabase.from("restaurants").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/restaurantes");
  return { ok: true, message: "Restaurante eliminado" };
}

// ---------------------------------------------------------------- Categorías
export async function saveCategoryAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id
      ? await ctx.supabase.from("categories").update(parsed.data).eq("id", id)
      : await ctx.supabase.from("categories").insert(parsed.data);
  if (error) return fail(error);
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoría guardada" };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("categories").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoría eliminada" };
}

// ---------------------------------------------------------------- Productos
export async function saveProductAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id
      ? await ctx.supabase.from("products").update(parsed.data).eq("id", id)
      : await ctx.supabase.from("products").insert(parsed.data);
  if (error) return fail(error);
  revalidatePath("/admin/productos");
  return { ok: true, message: "Producto guardado" };
}

const quickProductSchema = z.object({
  is_available: z.boolean().optional(),
  stock: z.number().int().min(0).max(1000000).nullable().optional(),
  price: z.number().min(0).max(100000).optional(),
});

export async function quickUpdateProductAction(id: string, patch: z.infer<typeof quickProductSchema>): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = quickProductSchema.safeParse(patch);
  if (!parsed.success || !uuid.safeParse(id).success) return { ok: false, error: "Datos inválidos" };
  const { error } = await ctx.supabase.from("products").update(parsed.data).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/productos");
  return { ok: true, message: "Producto actualizado" };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("products").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/productos");
  return { ok: true, message: "Producto eliminado" };
}

// ---------------------------------------------------------------- Clientes
export async function setCustomerStatusAction(userId: string, status: AccountStatus): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.rpc("admin_set_customer_status", { p_user_id: userId, p_status: status });
  if (error) return fail(error);
  revalidatePath("/admin/clientes");
  return { ok: true, message: status === "suspended" ? "Cuenta suspendida" : "Cuenta reactivada" };
}

export async function updateCustomerAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = z
    .object({
      user_id: z.uuid(),
      full_name: z.string().trim().min(3, "Nombre muy corto").max(120),
      phone: z.string().trim().regex(/^(\+?[0-9 ]{6,20})?$/, "Teléfono inválido"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { error } = await ctx.supabase.rpc("admin_update_customer", {
    p_user_id: parsed.data.user_id,
    p_full_name: parsed.data.full_name,
    p_phone: parsed.data.phone,
  });
  if (error) return fail(error);
  revalidatePath(`/admin/clientes/${parsed.data.user_id}`);
  return { ok: true, message: "Cliente actualizado" };
}

// ---------------------------------------------------------------- Repartidores
export async function saveCourierAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = courierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const id = formData.get("id");
  const data = { ...parsed.data, document_id: parsed.data.document_id ?? null };
  const { error } =
    typeof id === "string" && id
      ? await ctx.supabase.from("couriers").update(data).eq("id", id)
      : await ctx.supabase.from("couriers").insert(data);
  if (error) return fail(error);
  revalidatePath("/admin/repartidores");
  return { ok: true, message: "Repartidor guardado" };
}

/** Genera un enlace personal nuevo (invalida el anterior). El token se muestra una sola vez. */
export async function generateCourierLinkAction(courierId: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  if (!isServiceRoleConfigured()) return { ok: false, error: "Configura SUPABASE_SERVICE_ROLE_KEY para usar enlaces de repartidor." };
  const { token, hash } = generateCourierToken();
  const { error } = await ctx.supabase.from("couriers").update({ access_token_hash: hash }).eq("id", courierId);
  if (error) return fail(error);
  return { ok: true, data: { url: `${env.siteUrl}/repartidor/${token}` } };
}

export async function revokeCourierLinkAction(courierId: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("couriers").update({ access_token_hash: null }).eq("id", courierId);
  if (error) return fail(error);
  return { ok: true, message: "Enlace revocado" };
}

// ---------------------------------------------------------------- Cupones
export async function saveCouponAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = {
    ...parsed.data,
    starts_at: limaToISO(parsed.data.starts_at),
    expires_at: parsed.data.expires_at ? limaToISO(parsed.data.expires_at) : null,
  };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id
      ? await ctx.supabase.from("coupons").update(data).eq("id", id)
      : await ctx.supabase.from("coupons").insert(data);
  if (error) return fail(error);
  revalidatePath("/admin/promociones");
  return { ok: true, message: "Cupón guardado" };
}

export async function toggleCouponAction(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("coupons").update({ is_active: active }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/promociones");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { count } = await ctx.supabase.from("coupon_usages").select("id", { count: "exact", head: true }).eq("coupon_id", id);
  if (count) return { ok: false, error: "El cupón ya fue usado: desactívalo para conservar el historial." };
  const { error } = await ctx.supabase.from("coupons").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/promociones");
  return { ok: true, message: "Cupón eliminado" };
}

// ---------------------------------------------------------------- Configuración
export async function saveSettingsAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { error } = await ctx.supabase.from("platform_settings").update(parsed.data).eq("id", 1);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Configuración guardada" };
}

export async function purgeDemoDataAction(): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { data, error } = await ctx.supabase.rpc("admin_purge_demo_data");
  if (error) return fail(error);
  revalidatePath("/", "layout");
  const d = data as { products: number; restaurants: number; coupons: number; suspended: number };
  return {
    ok: true,
    message: `Eliminados: ${d.restaurants} restaurantes, ${d.products} productos, ${d.coupons} cupones. Suspendidos (con pedidos): ${d.suspended}.`,
  };
}
