"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { addressSchema, profileSchema } from "@/lib/validation/account";
import { firstError } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

const LOGIN_REQUIRED: ActionResult<never> = { ok: false, error: "Inicia sesión para continuar." };

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return LOGIN_REQUIRED;
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const supabase = await createSupabaseServerClient();
  // Solo columnas permitidas (la BD además bloquea role/status con privilegios por columna)
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone: parsed.data.phone }).eq("id", session.userId);
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
