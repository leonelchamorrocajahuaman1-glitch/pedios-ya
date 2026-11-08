import { Database } from "lucide-react";

/** Se muestra cuando faltan las variables de Supabase: la app no inventa datos. */
export function SetupNotice() {
  return (
    <div className="mx-auto my-10 max-w-2xl rounded-3xl border border-warning/40 bg-warning/10 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-warning/20 text-warning">
          <Database className="h-6 w-6" />
        </div>
        <div className="space-y-3 text-sm">
          <h2 className="font-display text-xl font-semibold">Conecta Supabase para empezar</h2>
          <p className="text-muted">
            La plataforma lee restaurantes, productos y pedidos desde tu base de datos real. Configura estas variables
            en <code>.env.local</code> (o en Vercel → Settings → Environment Variables) y reinicia:
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-surface p-4 text-xs leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave anon/publishable>
SUPABASE_SERVICE_ROLE_KEY=<clave service_role (solo servidor)>`}
          </pre>
          <p className="text-muted">
            Luego ejecuta las migraciones de <code>supabase/migrations</code> y, si quieres datos de ejemplo,
            <code> supabase/seed/demo_data.sql</code>. Los pasos completos están en el README.
          </p>
        </div>
      </div>
    </div>
  );
}
