import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/constants";

export function SiteFooter({ name = BRAND.name }: { name?: string }) {
  return (
    <footer className="mt-20 border-t border-border bg-surface pb-28 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo name={name} />
          <p className="max-w-sm text-sm text-muted">
            {BRAND.tagline}. {BRAND.meaning} Conectamos a los vecinos con los mejores negocios de su barrio.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Explora</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" href="/buscar">Restaurantes</Link></li>
            <li><Link className="hover:text-fg" href="/categoria/supermercados">Supermercados</Link></li>
            <li><Link className="hover:text-fg" href="/categoria/farmacias">Farmacias</Link></li>
            <li><Link className="hover:text-fg" href="/#promociones">Promociones</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Negocios</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" href="/afiliados">Registra tu negocio</Link></li>
            <li><Link className="hover:text-fg" href="/cuenta">Mi cuenta</Link></li>
            <li><Link className="hover:text-fg" href="/terminos">Términos y privacidad</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {name}. Hecho en Perú. Precios en soles (PEN), IGV incluido.
      </div>
    </footer>
  );
}
