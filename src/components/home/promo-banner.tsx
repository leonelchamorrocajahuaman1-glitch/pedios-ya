import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";

/** Banner publicitario de la portada. */
export function PromoBanner() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#12121a] text-white">
      <div className="grid-bg absolute inset-0 opacity-30" />
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/50 blur-[100px]" />
      <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-accent/50 blur-[100px]" />
      <div className="relative grid items-center gap-6 p-7 sm:p-10 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-lime" /> Mikuy Mercado
          </span>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            El mercado del barrio, <span className="text-lime">en tu puerta</span>.
          </h2>
          <p className="max-w-md text-sm text-white/70 sm:text-base">
            Frutas, abarrotes y botica 24 h con la misma rapidez que tu comida favorita.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/categoria/supermercados" className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-black transition hover:brightness-110">
              Hacer mercado <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/categoria/farmacias" className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold transition hover:bg-white/10">
              Farmacias
            </Link>
          </div>
        </div>
        <div className="relative hidden h-56 md:block">
          <div className="absolute right-0 top-0 h-48 w-48 rotate-6 overflow-hidden rounded-[2rem] border-4 border-white/10">
            <SmartImage src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80" alt="Frutas y verduras" fill sizes="200px" className="object-cover" />
          </div>
          <div className="absolute bottom-0 left-6 h-40 w-40 -rotate-6 overflow-hidden rounded-[2rem] border-4 border-white/10">
            <SmartImage src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&q=80" alt="Supermercado" fill sizes="160px" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
