/**
 * Variables de entorno públicas. Las secretas (service role) se leen solo en
 * módulos marcados con "server-only".
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/**
 * Cabecera que identifica a esta aplicación ante las políticas RLS durante la
 * transición desde el modelo anterior (ver migración 20261109000008).
 */
export const APP_HEADERS = { "x-app": "huaytalla" } as const;
