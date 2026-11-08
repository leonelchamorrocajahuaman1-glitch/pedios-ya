import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Hola de nuevo 👋</h1>
      <p className="mb-8 mt-2 text-muted">Ingresa para comprar, seguir tus pedidos en tiempo real y usar tus cupones.</p>
      <LoginForm next={safeNext} linkError={error === "link"} />
    </>
  );
}
