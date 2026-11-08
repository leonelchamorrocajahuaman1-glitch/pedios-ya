"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="font-display text-2xl font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted">No pudimos cargar esta sección. Verifica tu conexión e inténtalo nuevamente.{error.digest && ` (Ref. ${error.digest})`}</p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
