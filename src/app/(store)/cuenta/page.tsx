import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/account/profile-form";
import { buttonStyles } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { profile } = await requireUser("/cuenta");
  const { password } = await searchParams;
  return (
    <div className="space-y-6">
      {password === "updated" && <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">Tu contraseña fue actualizada.</p>}
      <Card>
        <CardHeader><CardTitle>Información personal</CardTitle></CardHeader>
        <CardBody><ProfileForm profile={profile} /></CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Seguridad</CardTitle></CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">Miembro desde {formatDate(profile.created_at)}. Te enviaremos un enlace para cambiar tu contraseña.</p>
          <Link href="/recuperar" className={buttonStyles({ variant: "outline" })}><KeyRound className="h-4 w-4" /> Cambiar contraseña</Link>
        </CardBody>
      </Card>
    </div>
  );
}
