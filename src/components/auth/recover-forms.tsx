"use client";

import { useActionState } from "react";
import Link from "next/link";
import { recoverAction, updatePasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function RecoverForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(recoverAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.success} />
      <Field label="Correo electrónico" htmlFor="email" error={state.fields?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Enviar enlace</Button>
      <p className="text-center text-sm"><Link href="/login" className="font-semibold text-brand hover:underline">Volver a iniciar sesión</Link></p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field label="Nueva contraseña" htmlFor="password" error={state.fields?.password} hint="Mín. 8 caracteres, letras y números">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={state.fields?.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Guardar contraseña</Button>
    </form>
  );
}
