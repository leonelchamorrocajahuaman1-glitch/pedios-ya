"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  if (state.success) return <FormMessage success={state.success} />;
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} />
      <Field label="Nombre completo" htmlFor="full_name" error={f.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" defaultValue={state.values?.full_name} aria-invalid={Boolean(f.full_name)} required />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" error={f.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} aria-invalid={Boolean(f.email)} required />
      </Field>
      <Field label="Celular" htmlFor="phone" error={f.phone}>
        <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="987 654 321" defaultValue={state.values?.phone} aria-invalid={Boolean(f.phone)} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contraseña" htmlFor="password" error={f.password} hint="Mín. 8 caracteres, letras y números">
          <PasswordInput id="password" name="password" autoComplete="new-password" aria-invalid={Boolean(f.password)} required />
        </Field>
        <Field label="Repite la contraseña" htmlFor="confirm" error={f.confirm}>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" aria-invalid={Boolean(f.confirm)} required />
        </Field>
      </div>
      <Checkbox name="terms" label={<>Acepto los <Link href="/terminos" className="font-semibold text-brand underline">términos y la política de privacidad</Link></>} />
      {f.terms && <p className="text-xs font-medium text-danger">{f.terms}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Crear cuenta</Button>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
      </p>
    </form>
  );
}
