"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { addressSchema, applicationSchema, profileSchema, reviewSchema } from "@/lib/validation/account";
import { walletPaymentSchema } from "@/lib/validation/checkout";
import { firstError } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import { z } from "zod";

const LOGIN_REQUIRED: ActionResult<never> = { ok: false, error: "Inicia sesión para continuar." };

export async function toggleFavoriteAction(restaurantId: string, favorite: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  if (!z.uuid().safeParse(restaurantId).success) return { ok: false, error: "Restaurante inválido" };
  const supabase = await createSupabaseServerClient();
  const { error } = favorite
    ? await supabase.from("favorites").upsert({ user_id: session.userId, restaurant_id: restaurantId })
    : await supabase.from("favorites").delete().eq("user_id", session.userId).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/cuenta/favoritos");
  return { ok: true };
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  // Solo columnas permitidas (la BD además bloquea role/status por privilegios de columna)
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
    .eq("id", session.userId);
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/cuenta");
  return { ok: true, message: "Perfil actualizado" };
}

export async function saveAddressAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const id = formData.get("id");
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
  const makeDefault = parsed.data.is_default || !count;
  if (makeDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", session.userId).eq("is_default", true);
  }
  const payload = { ...parsed.data, is_default: makeDefault, user_id: session.userId };
  const { data, error } =
    typeof id === "string" && id
      ? await supabase.from("addresses").update(payload).eq("id", id).select("id").single()
      : await supabase.from("addresses").insert(payload).select("id").single();
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/cuenta/direcciones");
  return { ok: true, data: { id: data.id as string }, message: "Dirección guardada" };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/cuenta/direcciones");
  return { ok: true, message: "Dirección eliminada" };
}

export async function submitReviewAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_review", {
    p_order_id: parsed.data.order_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment ?? null,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/cuenta/calificaciones");
  revalidatePath(`/pedidos/${parsed.data.order_id}`);
  return { ok: true, message: "¡Gracias por tu calificación!" };
}

export async function cancelOrderAction(orderId: string, reason?: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId, p_reason: reason ?? null });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true, message: "Pedido cancelado" };
}

export async function reportWalletPaymentAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const parsed = walletPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("report_wallet_payment", {
    p_order_id: parsed.data.order_id,
    p_operation_number: parsed.data.operation_number,
    p_payer_phone: parsed.data.payer_phone ?? null,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/pedidos/${parsed.data.order_id}`);
  return { ok: true, message: "Recibimos tu número de operación. Lo verificaremos en breve." };
}

export async function submitApplicationAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const parsed = applicationSchema.safeParse({
    ...Object.fromEntries(formData),
    category_ids: formData.getAll("category_ids"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const d = parsed.data;
  const { error } = await supabase.rpc("submit_restaurant_application", {
    p_name: d.name,
    p_description: d.description,
    p_address: d.address,
    p_district: d.district,
    p_phone: d.phone,
    p_email: d.email,
    p_category_ids: d.category_ids,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  return { ok: true, message: "Solicitud enviada. Nuestro equipo la revisará y te contactará." };
}
