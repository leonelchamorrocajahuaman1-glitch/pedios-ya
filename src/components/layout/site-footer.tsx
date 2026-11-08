import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { hoursSummary } from "@/components/home/delivery-info";
import type { Category, StoreSettings } from "@/types";

export function SiteFooter({ settings, categories }: { settings: StoreSettings | null; categories: Category[] }) {
  const wa = settings?.whatsapp?.replace(/[^0-9]/g, "");
  return (
    <footer className="mt-20 border-t border-border bg-surface pb-28 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{settings?.slogan ?? "Todo lo que necesitas, en un solo lugar"}. Tu minimarket de confianza, ahora también online.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {settings?.facebook_url && <a className="rounded-full border border-border px-3 py-1.5 hover:border-brand" href={settings.facebook_url} target="_blank" rel="noreferrer">Facebook</a>}
            {settings?.instagram_url && <a className="rounded-full border border-border px-3 py-1.5 hover:border-brand" href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
            {settings?.tiktok_url && <a className="rounded-full border border-border px-3 py-1.5 hover:border-brand" href={settings.tiktok_url} target="_blank" rel="noreferrer">TikTok</a>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Categorías</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted">
            {categories.slice(0, 10).map((c) => (
              <li key={c.id}><Link className="hover:text-fg" href={`/categoria/${c.slug}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Tu cuenta</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" href="/cuenta/pedidos">Mis pedidos</Link></li>
            <li><Link className="hover:text-fg" href="/cuenta">Mi perfil</Link></li>
            <li><Link className="hover:text-fg" href="/productos?ofertas=1">Ofertas</Link></li>
            <li><Link className="hover:text-fg" href="/terminos">Términos y privacidad</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Atención al cliente</h3>
          <ul className="space-y-2.5 text-sm text-muted">
            {settings?.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {settings.address}{settings.district && `, ${settings.district}`}</li>}
            {settings && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {hoursSummary(settings.opening_hours)}</li>}
            {settings?.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></li>}
            {wa && <li className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <a href={`https://wa.me/${wa.startsWith("51") ? wa : `51${wa}`}`} target="_blank" rel="noreferrer">WhatsApp {settings?.whatsapp}</a></li>}
            {settings?.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <a href={`mailto:${settings.email}`}>{settings.email}</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {settings?.business_name ?? "MULTIPRODUCTOS HUAYTALLA"} · Precios en soles (S/) con IGV incluido.
      </div>
    </footer>
  );
}
