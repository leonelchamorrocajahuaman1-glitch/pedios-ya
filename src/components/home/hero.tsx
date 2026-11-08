"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, BadgePercent, Clock, ShieldCheck, Truck } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { buttonStyles } from "@/components/ui/button";

gsap.registerPlugin(useGSAP);

const TILES = [
  { src: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80", alt: "Frutas y verduras frescas", cls: "col-span-2 row-span-2" },
  { src: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80", alt: "Leche fresca", cls: "" },
  { src: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80", alt: "Pan artesanal", cls: "" },
  { src: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80", alt: "Arroz", cls: "" },
  { src: "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=500&q=80", alt: "Snacks", cls: "" },
  { src: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&q=80", alt: "Huevos de granja", cls: "" },
];

export function Hero({ slogan, deliveryEta, freeFrom }: { slogan: string; deliveryEta: string; freeFrom: number | null }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .from("[data-h-line]", { yPercent: 110, duration: 0.9, stagger: 0.1 })
          .from("[data-h-fade]", { y: 18, opacity: 0, duration: 0.6, stagger: 0.07 }, "-=0.5")
          .from("[data-h-tile]", { scale: 0.85, opacity: 0, duration: 0.8, stagger: 0.08, ease: "back.out(1.4)" }, "-=0.7")
          .from("[data-h-badge]", { y: 20, opacity: 0, duration: 0.6 }, "-=0.4");
        gsap.to("[data-h-badge]", { y: -8, duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-accent/20 blur-[110px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <span data-h-fade className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> Minimarket online · Delivery y recojo en tienda
          </span>
          <h1 className="font-display text-[2.4rem] font-bold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block overflow-hidden"><span data-h-line className="block">Todo lo que necesitas,</span></span>
            <span className="block overflow-hidden"><span data-h-line className="block text-gradient">en un solo lugar.</span></span>
          </h1>
          <p data-h-fade className="max-w-xl text-base text-muted sm:text-lg">
            {slogan !== "Todo lo que necesitas, en un solo lugar" ? slogan : "Abarrotes, bebidas, snacks, lácteos, limpieza y mucho más. Haz tu pedido en minutos y recíbelo en casa."}
          </p>
          <div data-h-fade className="flex flex-wrap gap-3">
            <Link href="/productos" className={buttonStyles({ size: "lg" })}>
              Comprar ahora <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/productos?ofertas=1" className={buttonStyles({ variant: "outline", size: "lg" })}>
              <BadgePercent className="h-5 w-5 text-accent" /> Ver ofertas
            </Link>
          </div>
          <ul data-h-fade className="grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-brand" /> Entrega en {deliveryEta}</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 shrink-0 text-brand" /> {freeFrom ? `Delivery gratis desde S/ ${freeFrom.toFixed(0)}` : "Delivery a tu puerta"}</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand" /> Pagos verificados</li>
          </ul>
        </div>
        <div className="relative">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {TILES.map((t) => (
              <div key={t.alt} data-h-tile className={`relative aspect-square overflow-hidden rounded-3xl bg-surface-2 shadow-card ${t.cls}`}>
                <SmartImage src={t.src} alt={t.alt} fill priority sizes="(max-width: 1024px) 33vw, 20vw" className="object-cover" />
              </div>
            ))}
          </div>
          <div data-h-badge className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl sm:left-auto sm:right-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white"><BadgePercent className="h-5 w-5" /></span>
            <span className="text-sm"><span className="block font-bold">Ofertas cada semana</span><span className="text-muted">Precios bajos garantizados</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}
