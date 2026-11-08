import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SetupNotice } from "@/components/layout/setup-notice";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

// Siempre dinámico: depende de la sesión y de variables de entorno en tiempo de ejecución.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Panel administrativo", template: "%s · Admin Mikuy" }, robots: { index: false, follow: false } };

/**
 * Panel independiente del cliente. requireAdmin() valida en el servidor el rol
 * leído de la base de datos; un cliente que escriba /admin es redirigido.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { profile } = await requireAdmin();
  return (
    <div className="min-h-dvh lg:flex">
      <AdminSidebar name={profile.full_name || profile.email || "Admin"} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
