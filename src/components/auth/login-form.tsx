"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function LoginForm({ next, linkError, confirmed }: { next: string; linkError?: boolean; confirmed?: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage
        error={state.error ?? (linkError ? "El enlace no es válido o expiró. Solicita uno nuevo." : undefined)}
        success={!state.error && confirmed ? "¡Correo confirmado! Ya puedes iniciar sesión." : undefined}
      />
      <Field label="Correo electrónico" htmlFor="email" error={state.fields?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} aria-invalid={Boolean(state.fields?.email)} required />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state.fields?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" aria-invalid={Boolean(state.fields?.password)} required />
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar" className="text-sm font-semibold text-brand hover:underline">¿Olvidaste tu contraseña?</Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Iniciar sesión</Button>
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta? <Link href={`/registro${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">Regístrate gratis</Link>
      </p>
    </form>
  );
}
