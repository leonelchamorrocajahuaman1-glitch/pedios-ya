import type { Metadata } from "next";
import { RecoverForm } from "@/components/auth/recover-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Recupera tu acceso</h1>
      <p className="mb-8 mt-2 text-muted">Te enviaremos un enlace seguro para crear una nueva contraseña.</p>
      <RecoverForm />
    </>
  );
}
