"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, newPasswordSchema, recoverSchema, registerSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/form";
import { toUserMessage } from "@/lib/errors";
import { env, isSupabaseConfigured } from "@/lib/env";

export interface AuthFormState {
  error?: string;
  fields?: Record<string, string>;
  success?: string;
  values?: Record<string, string>;
}

const NOT_CONFIGURED: AuthFormState = { error: "Supabase no está configurado todavía. Revisa el README." };

/** Solo se permiten redirecciones internas (evita open redirects). */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function originUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : env.siteUrl;
}

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: toUserMessage(error), values };

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return { error: "Tu cuenta está suspendida. Escríbenos a soporte si crees que es un error.", values };
  }
  const next = safeNext(formData.get("next"));
  if (profile?.role === "admin" && next === "/") redirect("/admin");
  redirect(next.startsWith("/admin") && profile?.role !== "admin" ? "/" : next);
}

export async function registerAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const raw = Object.fromEntries(formData);
  const values = { full_name: String(raw.full_name ?? ""), email: String(raw.email ?? ""), phone: String(raw.phone ?? "") };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  // Solo se envían nombre y teléfono: el rol SIEMPRE lo asigna la base de datos como "customer".
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      emailRedirectTo: `${await originUrl()}/auth/confirm?next=/`,
    },
  });
  if (error) return { error: toUserMessage(error), values };
  if (data.session) redirect("/");
  return {
    success: "¡Listo! Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada (y spam).",
  };
}

export async function recoverAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = recoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await originUrl()}/auth/confirm?next=/actualizar-clave`,
  });
  if (error && !error.message.toLowerCase().includes("rate")) {
    // No revelamos si el correo existe o no.
    console.error("resetPasswordForEmail", error.message);
  }
  if (error?.message.toLowerCase().includes("rate")) return { error: toUserMessage(error) };
  return { success: "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña." };
}

export async function updatePasswordAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "El enlace expiró. Solicita uno nuevo desde «¿Olvidaste tu contraseña?»." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: toUserMessage(error) };
  redirect("/cuenta?password=updated");
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
