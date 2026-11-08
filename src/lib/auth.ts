import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/types";

/** Usuario autenticado + perfil (consulta deduplicada por request). */
export const getSession = cache(async (): Promise<{ userId: string; profile: Profile } | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSupabaseServerClient();
  // getUser() valida el token contra Supabase Auth (no confía en la cookie).
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();
  if (!profile) return null;
  return { userId: data.user.id, profile };
});

export async function requireUser(next = "/") {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/**
 * Exige rol admin verificado en el servidor (perfil en BD). Un cliente que
 * escriba /admin en la URL es redirigido; además, la BD rechaza sus consultas por RLS.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.profile.role !== "admin" || session.profile.status !== "active") redirect("/?error=forbidden");
  return session;
}

/** Variante para Server Actions: devuelve null en vez de redirigir. */
export async function assertAdmin() {
  const session = await getSession();
  if (!session || session.profile.role !== "admin" || session.profile.status !== "active") return null;
  return session;
}
