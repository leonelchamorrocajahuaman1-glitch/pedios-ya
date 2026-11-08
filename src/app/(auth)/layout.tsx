import { Logo } from "@/components/brand/logo";
import { SmartImage } from "@/components/ui/smart-image";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SetupNotice } from "@/components/layout/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

// Siempre dinámico: depende de la sesión y de variables de entorno en tiempo de ejecución.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {isSupabaseConfigured ? children : <SetupNotice />}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-[#0d0d14] lg:block">
        <SmartImage src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80" alt="" fill sizes="50vw" className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] via-[#0d0d14]/40 to-transparent" />
        <div className="grid-bg absolute inset-0 opacity-20" />
        <div className="absolute bottom-0 p-12 text-white">
          <p className="font-display text-4xl font-bold leading-tight">
            Todo lo que necesitas, <br /> <span className="text-lime">en un solo lugar</span>.
          </p>
          <p className="mt-3 max-w-md text-white/70">Abarrotes, bebidas, lácteos, limpieza y más de MULTIPRODUCTOS HUAYTALLA, con delivery o recojo en tienda.</p>
        </div>
      </div>
    </div>
  );
}
