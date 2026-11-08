"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitApplicationAction } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { Category } from "@/types";

export function ApplicationForm({ categories }: { categories: Category[] }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  if (sent) return <p className="rounded-2xl bg-success/10 p-5 text-success">¡Gracias! Recibimos tu solicitud. Te contactaremos al validar la información.</p>;
  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const res = await submitApplicationAction(fd);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          setSent(true);
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del negocio" htmlFor="name"><Input id="name" name="name" required maxLength={100} /></Field>
        <Field label="Distrito" htmlFor="district"><Input id="district" name="district" required maxLength={80} /></Field>
      </div>
      <Field label="Dirección" htmlFor="address"><Input id="address" name="address" required maxLength={200} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" required inputMode="tel" maxLength={20} /></Field>
        <Field label="Correo de contacto" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
      </div>
      <Field label="Cuéntanos de tu negocio" htmlFor="description"><Textarea id="description" name="description" maxLength={600} /></Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Categorías</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input type="checkbox" name="category_ids" value={c.id} className="peer sr-only" />
              <span className="inline-block rounded-full border border-border px-3 py-1.5 text-sm transition peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand peer-focus-visible:ring-2">{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={pending} size="lg">Enviar solicitud</Button>
    </form>
  );
}
