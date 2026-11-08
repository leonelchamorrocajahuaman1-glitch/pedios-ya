import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, KeyRound, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/account/profile-form";
import { buttonStyles } from "@/components/ui/button";
import { formatDate, formatPEN } from "@/lib/format";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { profile, userId } = await requireUser("/cuenta");
  const { password } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: orders }, { count: addresses }] = await Promise.all([
    supabase.from("orders").select("total, status").eq("catalog", "store").eq("user_id", userId),
    supabase.from("addresses").select("id", { count: "exact", head: true }),
  ]);
  const delivered = (orders ?? []).filter((o) => o.status === "delivered");
  return (
    <div className="space-y-6">
      {password === "updated" && <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">Tu contraseña fue actualizada.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/cuenta/pedidos" className="rounded-3xl border border-border bg-surface p-5 transition hover:border-brand"><ClipboardList className="h-5 w-5 text-brand" /><p className="mt-3 font-display text-2xl font-bold">{orders?.length ?? 0}</p><p className="text-sm text-muted">Pedidos realizados</p></Link>
        <div className="rounded-3xl border border-border bg-surface p-5"><p className="text-sm text-muted">Total comprado</p><p className="mt-3 font-display text-2xl font-bold">{formatPEN(delivered.reduce((a, o) => a + Number(o.total), 0))}</p><p className="text-sm text-muted">En pedidos entregados</p></div>
        <Link href="/cuenta/direcciones" className="rounded-3xl border border-border bg-surface p-5 transition hover:border-brand"><MapPin className="h-5 w-5 text-brand" /><p className="mt-3 font-display text-2xl font-bold">{addresses ?? 0}</p><p className="text-sm text-muted">Direcciones guardadas</p></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Datos personales</CardTitle></CardHeader>
        <CardBody><ProfileForm profile={profile} /></CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Configuración de la cuenta</CardTitle></CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">Cliente desde {formatDate(profile.created_at)}. Te enviaremos un enlace seguro a tu correo para cambiar la contraseña.</p>
          <Link href="/recuperar" className={buttonStyles({ variant: "outline" })}><KeyRound className="h-4 w-4" /> Cambiar contraseña</Link>
        </CardBody>
      </Card>
    </div>
  );
}
