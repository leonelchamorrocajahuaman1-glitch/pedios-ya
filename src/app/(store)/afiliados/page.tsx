import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, Bike, LineChart } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCategories } from "@/lib/services/catalog";
import { ApplicationForm } from "@/components/account/application-form";
import { Card, CardBody } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = { title: "Registra tu negocio" };

export default async function PartnersPage() {
  const [session, categories] = await Promise.all([getSession(), getCategories()]);
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="space-y-6">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Lleva tu negocio a <span className="text-gradient">miles de vecinos</span></h1>
        <p className="text-muted">Restaurantes, bodegas, minimarkets y boticas: publica tu catálogo, recibe pedidos y nosotros nos encargamos del reparto.</p>
        <ul className="space-y-4">
          {[
            { icon: BadgePercent, t: "Comisión transparente", d: "Pagas solo por pedido entregado. Sin costos de afiliación." },
            { icon: Bike, t: "Red de repartidores", d: "Repartidores verificados con seguimiento en tiempo real." },
            { icon: LineChart, t: "Panel de ventas", d: "Conoce tus ventas, productos populares y calificaciones." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand"><Icon className="h-5 w-5" /></span>
              <span><span className="block font-semibold">{t}</span><span className="text-sm text-muted">{d}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <Card>
        <CardBody>
          {session ? (
            <ApplicationForm categories={categories} />
          ) : (
            <div className="space-y-4 py-8 text-center">
              <p className="text-muted">Inicia sesión o crea una cuenta para enviar la solicitud de tu negocio.</p>
              <Link href="/login?next=/afiliados" className={buttonStyles()}>Iniciar sesión</Link>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
