"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateProfileAction } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { Profile } from "@/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const res = await updateProfileAction(fd);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor="full_name">
          <Input id="full_name" name="full_name" defaultValue={profile.full_name} required minLength={3} maxLength={120} />
        </Field>
        <Field label="Celular" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} inputMode="tel" maxLength={20} />
        </Field>
      </div>
      <Field label="Correo electrónico" htmlFor="email" hint="Para cambiar tu correo escríbenos a soporte.">
        <Input id="email" value={profile.email ?? ""} disabled readOnly />
      </Field>
      <Button type="submit" loading={pending}>Guardar cambios</Button>
    </form>
  );
}
