"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/types";

/** Ejecuta una Server Action, muestra el resultado y refresca la vista del servidor. */
export function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = <T,>(fn: () => Promise<ActionResult<T>>, onOk?: (res: ActionResult<T> & { ok: true }) => void) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        const res = await fn();
        if (!res.ok) {
          toast.error(res.error);
          resolve(false);
          return;
        }
        if (res.message) toast.success(res.message);
        onOk?.(res);
        router.refresh();
        resolve(true);
      }),
    );
  return { pending, run };
}
