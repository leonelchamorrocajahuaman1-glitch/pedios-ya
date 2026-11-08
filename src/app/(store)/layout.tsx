import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/services/catalog";
import { isSupabaseConfigured } from "@/lib/env";
import { BRAND } from "@/lib/constants";

// Siempre dinámico: depende de la sesión y de variables de entorno en tiempo de ejecución.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [session, settings] = isSupabaseConfigured ? await Promise.all([getSession(), getSettings()]) : [null, null];
  const name = settings?.platform_name ?? BRAND.name;
  return (
    <>
      <SiteHeader
        platformName={name}
        user={
          session
            ? { id: session.userId, name: session.profile.full_name || session.profile.email || "", isAdmin: session.profile.role === "admin" }
            : null
        }
      />
      {session?.profile.status === "suspended" && (
        <div className="bg-danger px-4 py-2 text-center text-sm font-medium text-white">
          Tu cuenta está suspendida: no puedes realizar pedidos. Contacta a soporte.
        </div>
      )}
      <main className="min-h-[60dvh]">{isSupabaseConfigured ? children : <SetupNotice />}</main>
      <SiteFooter name={name} />
      <MobileNav />
    </>
  );
}
