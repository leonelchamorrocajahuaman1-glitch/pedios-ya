"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  categorySchema, couponSchema, deliveryZoneSchema, inventorySchema, paymentMethodSchema, productSchema, promotionSchema, settingsSchema,
} from "@/lib/validation/admin";
import { firstError } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { AccountStatus, ActionResult, OrderStatus } from "@/types";

/**
 * Acciones del panel. Cada una:
 * 1) verifica en el servidor que el usuario sea administrador activo (rol leído de la BD);
 * 2) usa el cliente con la sesión del usuario, así RLS vuelve a exigir is_admin();
 * 3) queda registrada en admin_audit_logs (triggers y funciones de la BD).
 */
const FORBIDDEN: ActionResult<never> = { ok: false, error: "No autorizado" };
const uuid = z.uuid();

async function adminClient() {
  const session = await assertAdmin();
  if (!session) return null;
  return { session, supabase: await createSupabaseServerClient() };
}
const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: toUserMessage(e) });

/** "2026-11-09T10:00" (hora de Lima) → ISO UTC. Perú no usa horario de verano. */
function limaToISO(value: string) {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.length === 16 ? `${value}:00` : value}-05:00`).toISOString();
}

// ---------------------------------------------------------------- Pedidos
export async function setOrderStatusAction(orderId: string, status: OrderStatus, note?: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Pedido inválido" };
  const { error } = await ctx.supabase.rpc("admin_set_order_status", { p_order_id: orderId, p_status: status, p_note: note?.slice(0, 300) || null });
  if (error) return fail(error);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Estado actualizado" };
}

export async function setDeliveryPersonAction(orderId: string, name: string, phone: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.rpc("admin_set_delivery_person", { p_order_id: orderId, p_name: name, p_phone: phone });
  if (error) return fail(error);
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true, message: "Encargado de la entrega guardado" };
}

export async function reviewPaymentAction(paymentId: string, approve: boolean, note?: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.rpc("admin_review_payment", { p_payment_id: paymentId, p_approve: approve, p_note: note?.slice(0, 200) || null });
  if (error) return fail(error);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: approve ? "Pago verificado" : "Pago rechazado" };
}

/** URL temporal (5 min) para ver el comprobante privado. RLS exige admin o dueño. */
export async function getProofUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { data, error } = await ctx.supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
  if (error || !data) return fail(error ?? "No se encontró el comprobante");
  return { ok: true, data: { url: data.signedUrl } };
}

// ---------------------------------------------------------------- Productos
export async function saveProductAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { gallery, slug, stock, ...data } = parsed.data;
  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;
  const finalSlug = slug || `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { ...data, slug: finalSlug, catalog: "store", section: "Catálogo" };

  // El stock de un producto existente solo cambia desde Inventario (con motivo y registro).
  const { data: row, error } = isEdit
    ? await ctx.supabase.from("products").update(base).eq("id", id).eq("catalog", "store").select("id").single()
    : await ctx.supabase.from("products").insert({ ...base, stock: stock ?? 0 }).select("id").single();
  if (error) return fail(error);
  const productId = row.id as string;

  const { error: delErr } = await ctx.supabase.from("product_images").delete().eq("product_id", productId);
  if (delErr) return fail(delErr);
  if (gallery.length) {
    const { error: imgErr } = await ctx.supabase
      .from("product_images")
      .insert(gallery.map((url, i) => ({ product_id: productId, url, alt: data.name, sort_order: i })));
    if (imgErr) return fail(imgErr);
  }
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true, data: { id: productId }, message: isEdit ? "Producto actualizado" : "Producto creado" };
}

export async function toggleProductAction(id: string, available: boolean): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("products").update({ is_available: available }).eq("id", id).eq("catalog", "store");
  if (error) return fail(error);
  revalidatePath("/admin/productos");
  return { ok: true, message: available ? "Producto activado" : "Producto desactivado" };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  // Los pedidos conservan nombre, precio y cantidad; el producto se puede eliminar.
  const { error } = await ctx.supabase.from("products").delete().eq("id", id).eq("catalog", "store");
  if (error) return fail(error);
  revalidatePath("/admin/productos");
  return { ok: true, message: "Producto eliminado" };
}

// ---------------------------------------------------------------- Categorías
export async function saveCategoryAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const id = formData.get("id");
  if (typeof id === "string" && id && parsed.data.parent_id === id) return { ok: false, error: "Una categoría no puede ser su propia subcategoría" };
  const payload = { ...parsed.data, catalog: "store" };
  const { error } =
    typeof id === "string" && id
      ? await ctx.supabase.from("categories").update(payload).eq("id", id).eq("catalog", "store")
      : await ctx.supabase.from("categories").insert(payload);
  if (error) return fail(error);
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true, message: "Categoría guardada" };
}

export async function moveCategoryAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { data: cat } = await ctx.supabase.from("categories").select("id, parent_id, sort_order").eq("id", id).single();
  if (!cat) return { ok: false, error: "Categoría no encontrada" };
  let q = ctx.supabase.from("categories").select("id, sort_order").eq("catalog", "store");
  q = cat.parent_id ? q.eq("parent_id", cat.parent_id) : q.is("parent_id", null);
  const { data: siblings } = await q.order("sort_order").order("name");
  const list = siblings ?? [];
  const i = list.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  const reordered = [...list];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  for (const [index, c] of reordered.entries()) {
    const { error } = await ctx.supabase.from("categories").update({ sort_order: index + 1 }).eq("id", c.id);
    if (error) return fail(error);
  }
  revalidatePath("/admin/categorias");
  return { ok: true };
}

export async function toggleCategoryAction(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("categories").update({ is_active: active }).eq("id", id).eq("catalog", "store");
  if (error) return fail(error);
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true, message: active ? "Categoría visible" : "Categoría oculta" };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Categoría inválida" };
  const { count: kids } = await ctx.supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id);
  if (kids) return { ok: false, error: `Tiene ${kids} subcategoría(s). Elimínalas o muévelas primero.` };
  const { count } = await ctx.supabase.from("products").select("id", { count: "exact", head: true }).or(`category_id.eq.${id},subcategory_id.eq.${id}`);
  if (count) return { ok: false, error: `Tiene ${count} producto(s). Muévelos a otra categoría o desactívala.` };
  const { error } = await ctx.supabase.from("categories").delete().eq("id", id).eq("catalog", "store");
  if (error) return fail(error);
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoría eliminada" };
}

// ---------------------------------------------------------------- Inventario
export async function inventoryMoveAction(formData: FormData): Promise<ActionResult<{ stock: number }>> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = inventorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  const { data, error } = await ctx.supabase.rpc("admin_inventory_move", { p_product_id: d.product_id, p_type: d.type, p_quantity: d.quantity, p_reason: d.reason });
  if (error) return fail(error);
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/productos");
  return { ok: true, data: { stock: data as number }, message: `Stock actualizado: ${data} unidades` };
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
    .object({ user_id: z.uuid(), full_name: z.string().trim().min(3, "Nombre muy corto").max(120), phone: z.string().trim().regex(/^(\+?[0-9 ]{6,20})?$/, "Teléfono inválido") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { error } = await ctx.supabase.rpc("admin_update_customer", { p_user_id: parsed.data.user_id, p_full_name: parsed.data.full_name, p_phone: parsed.data.phone });
  if (error) return fail(error);
  revalidatePath(`/admin/clientes/${parsed.data.user_id}`);
  return { ok: true, message: "Cliente actualizado" };
}

// ---------------------------------------------------------------- Promociones y cupones
export async function savePromotionAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = promotionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  const payload = {
    ...d,
    product_id: d.scope === "product" ? d.product_id : null,
    category_id: d.scope === "category" ? d.category_id : null,
    min_order_amount: d.scope === "order" ? d.min_order_amount : 0,
    starts_at: limaToISO(d.starts_at),
    ends_at: d.ends_at ? limaToISO(d.ends_at) : null,
  };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id ? await ctx.supabase.from("promotions").update(payload).eq("id", id) : await ctx.supabase.from("promotions").insert(payload);
  if (error) return fail(error);
  revalidatePath("/admin/promociones");
  revalidatePath("/", "layout");
  return { ok: true, message: "Promoción guardada" };
}

export async function togglePromotionAction(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("promotions").update({ is_active: active }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/promociones");
  return { ok: true };
}

export async function deletePromotionAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("promotions").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/promociones");
  return { ok: true, message: "Promoción eliminada" };
}

export async function saveCouponAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = {
    ...parsed.data,
    catalog: "store",
    starts_at: limaToISO(parsed.data.starts_at),
    expires_at: parsed.data.expires_at ? limaToISO(parsed.data.expires_at) : null,
  };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id ? await ctx.supabase.from("coupons").update(data).eq("id", id) : await ctx.supabase.from("coupons").insert(data);
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
  const { error } = await ctx.supabase.from("store_settings").update(parsed.data).eq("id", 1);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Configuración guardada" };
}

export async function savePaymentMethodAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = paymentMethodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { code, ...data } = parsed.data;
  if ((code === "yape" || code === "plin") && data.is_enabled && !data.phone_number) {
    return { ok: false, error: "Para activar Yape o Plin registra el número que recibirá los pagos." };
  }
  const { error } = await ctx.supabase.from("payment_methods").update(data).eq("code", code);
  if (error) return fail(error);
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Método de pago actualizado" };
}

export async function saveDeliveryZoneAction(formData: FormData): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const parsed = deliveryZoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id ? await ctx.supabase.from("delivery_zones").update(parsed.data).eq("id", id) : await ctx.supabase.from("delivery_zones").insert(parsed.data);
  if (error) return fail(error);
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Zona guardada" };
}

export async function deleteDeliveryZoneAction(id: string): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { error } = await ctx.supabase.from("delivery_zones").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Zona eliminada" };
}

export async function purgeDemoAction(): Promise<ActionResult> {
  const ctx = await adminClient();
  if (!ctx) return FORBIDDEN;
  const { data, error } = await ctx.supabase.rpc("admin_purge_store_demo");
  if (error) return fail(error);
  revalidatePath("/", "layout");
  const d = data as { products: number; promotions: number; coupons: number };
  return { ok: true, message: `Eliminados: ${d.products} productos, ${d.promotions} promociones y ${d.coupons} cupones de demostración.` };
}
