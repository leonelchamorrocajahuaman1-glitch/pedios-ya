import Link from "next/link";
import { ArrowRight, BadgePercent, Truck } from "lucide-react";
import type { Promotion } from "@/types";
import { formatPEN } from "@/lib/format";

const GRADIENTS = [
  "from-[#15803d] via-[#16a34a] to-[#65a30d]",
  "from-[#ea580c] via-[#f97316] to-[#f59e0b]",
  "from-[#0f172a] via-[#14532d] to-[#166534]",
];

/** Banners de promociones vigentes (datos reales de la tabla promotions). */
export function PromoBanners({ promotions, freeFrom }: { promotions: Promotion[]; freeFrom: number | null }) {
  const cards = promotions.slice(0, 2).map((p) => ({
    key: p.id,
    title: p.name,
    text: p.description || (p.scope === "order" ? `En compras desde ${formatPEN(p.min_order_amount)}` : "Descuento aplicado automáticamente"),
    badge: p.discount_type === "percentage" ? `-${Number(p.discount_value)}%` : `-${formatPEN(p.discount_value)}`,
    href: "/productos?ofertas=1",
  }));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c, i) => (
        <Link key={c.key} href={c.href} className={`promo-stripes group relative overflow-hidden rounded-3xl bg-gradient-to-br ${GRADIENTS[i]} p-6 text-white shadow-card transition hover:-translate-y-1`}>
          <span className="absolute -right-6 -top-6 grid h-28 w-28 place-items-center rounded-full bg-white/15 font-display text-2xl font-bold">{c.badge}</span>
          <BadgePercent className="h-7 w-7" />
          <p className="mt-6 font-display text-2xl font-bold leading-tight">{c.title}</p>
          <p className="mt-1 text-sm text-white/85">{c.text}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">Aprovechar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
      ))}
      <Link href="/productos" className={`promo-stripes group relative overflow-hidden rounded-3xl bg-gradient-to-br ${GRADIENTS[2]} p-6 text-white shadow-card transition hover:-translate-y-1 ${cards.length === 0 ? "md:col-span-3" : cards.length === 1 ? "md:col-span-2" : ""}`}>
        <Truck className="h-7 w-7 text-lime" />
        <p className="mt-6 font-display text-2xl font-bold leading-tight">{freeFrom ? <>Delivery <span className="text-lime">gratis</span> desde {formatPEN(freeFrom)}</> : "Delivery rápido a tu puerta"}</p>
        <p className="mt-1 text-sm text-white/80">O recoge tu pedido en tienda sin costo.</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">Llenar mi carrito <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </Link>
    </div>
  );
}
