import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="space-y-5">
        <LogoMark className="mx-auto h-16 w-16" />
        <p className="font-display text-7xl font-bold text-gradient">404</p>
        <h1 className="font-display text-2xl font-semibold">Esta página se fue a otra dirección</h1>
        <p className="text-muted">No encontramos lo que buscabas.</p>
        <Link href="/" className={buttonStyles()}>Volver al inicio</Link>
      </div>
    </div>
  );
}
