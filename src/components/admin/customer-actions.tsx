"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { setCustomerStatusAction, updateCustomerAction } from "@/lib/actions/admin";
import type { Profile } from "@/types";

export function CustomerStatusButton({ profile }: { profile: Pick<Profile, "id" | "status" | "role" | "full_name"> }) {
  const router = useRouter();
  if (profile.role === "admin") return <span className="text-xs text-muted">Administrador</span>;
  const suspend = profile.status === "active";
  return (
    <ConfirmButton
      size="sm"
      variant={suspend ? "outline" : "success"}
      title={suspend ? `¿Suspender a ${profile.full_name || "este cliente"}?` : "¿Reactivar cuenta?"}
      description={suspend ? "No podrá realizar pedidos ni iniciar sesión." : "Podrá volver a comprar."}
      confirmLabel={suspend ? "Suspender" : "Reactivar"}
      onConfirm={async () => {
        const res = await setCustomerStatusAction(profile.id, suspend ? "suspended" : "active");
        if (!res.ok) toast.error(res.error);
        else { toast.success(res.message); router.refresh(); }
      }}
    >
      {suspend ? "Suspender" : "Reactivar"}
    </ConfirmButton>
  );
}

export function CustomerEditForm({ profile }: { profile: Pick<Profile, "id" | "full_name" | "phone"> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3" action={(fd) => start(async () => {
      const res = await updateCustomerAction(fd);
      if (!res.ok) toast.error(res.error); else { toast.success(res.message); router.refresh(); }
    })}>
      <input type="hidden" name="user_id" value={profile.id} />
      <Field label="Nombre" htmlFor="cfn"><Input id="cfn" name="full_name" defaultValue={profile.full_name} required /></Field>
      <Field label="Teléfono" htmlFor="cph"><Input id="cph" name="phone" defaultValue={profile.phone ?? ""} /></Field>
      <Button type="submit" size="sm" loading={pending}>Guardar</Button>
    </form>
  );
}
