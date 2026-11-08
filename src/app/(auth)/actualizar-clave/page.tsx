import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/recover-forms";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Crea una nueva contraseña</h1>
      <p className="mb-8 mt-2 text-muted">Elige una contraseña segura que no uses en otros sitios.</p>
      <NewPasswordForm />
    </>
  );
}
