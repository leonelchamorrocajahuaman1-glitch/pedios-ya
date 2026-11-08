"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { saveAddressAction } from "@/lib/actions/account";
import type { Address } from "@/types";

/** Alta/edición de dirección de entrega (con referencia para quien entrega). */
export function AddressForm({ address, onSaved }: { address?: Address; onSaved?: (id: string) => void }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const res = await saveAddressAction(fd);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message ?? "Guardado");
          onSaved?.(res.data!.id);
        })
      }
    >
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="label"><Input id="label" name="label" defaultValue={address?.label ?? "Casa"} maxLength={40} required /></Field>
        <Field label="Distrito" htmlFor="district"><Input id="district" name="district" defaultValue={address?.district} placeholder="San Juan de Lurigancho" required maxLength={80} /></Field>
      </div>
      <Field label="Dirección" htmlFor="street"><Input id="street" name="street" defaultValue={address?.street} placeholder="Jr. Las Flores 123, Mz. A Lt. 5" required maxLength={200} /></Field>
      <input type="hidden" name="city" value={address?.city ?? "Lima"} />
      <Field label="Referencia" htmlFor="reference" hint="Ayuda a encontrarte: color de fachada, cerca de…">
        <Input id="reference" name="reference" defaultValue={address?.reference ?? ""} maxLength={250} placeholder="Frente al parque, puerta verde" />
      </Field>
      <Checkbox name="is_default" defaultChecked={address?.is_default} label="Usar como dirección principal" />
      <Button type="submit" loading={pending} className="w-full sm:w-auto">Guardar dirección</Button>
    </form>
  );
}
