import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getSession } from "@/lib/auth";
import { getCategoryTree, getStoreSettings } from "@/lib/services/store";
import { isSupabaseConfigured } from "@/lib/env";

// Siempre dinámico: depende de la sesión y de variables de entorno en tiempo de ejecución.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const [session, settings, categories] = await Promise.all([getSession(), getStoreSettings(), getCategoryTree()]);
  return (
    <>
      <SiteHeader
        categories={categories}
        user={session ? { id: session.userId, name: session.profile.full_name || session.profile.email || "", isAdmin: session.profile.role === "admin" } : null}
      />
      {settings && !settings.accepting_orders && (
        <div className="bg-warning px-4 py-2 text-center text-sm font-medium text-white">En este momento no estamos recibiendo pedidos. ¡Vuelve pronto!</div>
      )}
      {session?.profile.status === "suspended" && (
        <div className="bg-danger px-4 py-2 text-center text-sm font-medium text-white">Tu cuenta está suspendida: no puedes realizar pedidos. Contáctanos.</div>
      )}
      <main className="min-h-[60dvh]">{children}</main>
      <SiteFooter settings={settings} categories={categories} />
      <MobileNav />
    </>
  );
}
