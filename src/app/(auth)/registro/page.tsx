import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Crea tu cuenta</h1>
      <p className="mb-8 mt-2 text-muted">Es gratis y toma menos de un minuto.</p>
      <RegisterForm />
    </>
  );
}
