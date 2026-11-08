"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Bike, ShieldCheck, Timer } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { buttonStyles } from "@/components/ui/button";

gsap.registerPlugin(useGSAP);

const FLOATING = [
  { src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80", alt: "Hamburguesa", cls: "left-[4%] top-[8%] h-36 w-36 sm:h-44 sm:w-44" },
  { src: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80", alt: "Pizza", cls: "right-[2%] top-[2%] h-40 w-40 sm:h-52 sm:w-52" },
  { src: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&q=80", alt: "Sushi", cls: "left-[18%] bottom-[2%] h-32 w-32 sm:h-40 sm:w-40" },
  { src: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=500&q=80", alt: "Ceviche", cls: "right-[12%] bottom-[6%] h-36 w-36 sm:h-44 sm:w-44" },
];

export function Hero({ restaurantCount }: { restaurantCount: number }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from("[data-hero-line]", { yPercent: 110, duration: 1, stagger: 0.12 })
          .from("[data-hero-fade]", { y: 20, opacity: 0, duration: 0.7, stagger: 0.08 }, "-=0.6")
          .from("[data-hero-food]", { scale: 0.4, opacity: 0, rotate: -25, duration: 1.1, stagger: 0.1, ease: "back.out(1.6)" }, "-=0.9")
          .from("[data-hero-ring]", { scale: 0.6, opacity: 0, duration: 1.2 }, "<");

        gsap.utils.toArray<HTMLElement>("[data-hero-food]").forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 14 : -14, rotate: i % 2 ? 4 : -4, duration: 3 + i * 0.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
        });
        gsap.to("[data-hero-ring]", { rotate: 360, duration: 60, repeat: -1, ease: "none" });
        gsap.to("[data-hero-courier]", { x: 18, duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut" });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-brand/25 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent/25 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-7">
          <span data-hero-fade className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-semibold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
            {restaurantCount > 0 ? `${restaurantCount} negocios abiertos para ti en Lima` : "Delivery en Lima"}
          </span>
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block overflow-hidden"><span data-hero-line className="block">Tu antojo,</span></span>
            <span className="block overflow-hidden"><span data-hero-line className="block text-gradient">a la velocidad</span></span>
            <span className="block overflow-hidden"><span data-hero-line className="block">de tu barrio.</span></span>
          </h1>
          <p data-hero-fade className="max-w-lg text-base text-muted sm:text-lg">
            Comida, mercado y farmacia de negocios cercanos. Sigue a tu repartidor en el mapa y paga con Yape, Plin,
            efectivo o tarjeta.
          </p>
          <div data-hero-fade className="flex flex-wrap gap-3">
            <Link href="/buscar" className={buttonStyles({ variant: "primary", size: "lg" })}>
              Explorar restaurantes <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#promociones" className={buttonStyles({ variant: "outline", size: "lg" })}>
              Ver promociones
            </Link>
          </div>
          <ul data-hero-fade className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
            <li className="flex items-center gap-2"><Timer className="h-4 w-4 text-brand" /> Entregas desde 15 min</li>
            <li className="flex items-center gap-2"><Bike className="h-4 w-4 text-brand" /> Seguimiento en vivo</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /> Pagos verificados</li>
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          <div data-hero-ring className="absolute inset-[10%] rounded-full border border-dashed border-brand/40" />
          <div className="absolute inset-[24%] rounded-full bg-gradient-to-br from-brand via-accent to-brand opacity-90 shadow-[0_0_120px_-20px_var(--brand)]" />
          <div className="absolute inset-[24%] grid place-items-center rounded-full">
            <div data-hero-courier className="grid h-24 w-24 place-items-center rounded-full bg-white/15 backdrop-blur-sm sm:h-28 sm:w-28">
              <Bike className="h-12 w-12 text-white sm:h-14 sm:w-14" />
            </div>
          </div>
          {FLOATING.map((f) => (
            <div key={f.alt} data-hero-food className={`absolute overflow-hidden rounded-[2rem] border-4 border-surface shadow-2xl ${f.cls}`}>
              <SmartImage src={f.src} alt={f.alt} fill sizes="220px" className="object-cover" priority />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
