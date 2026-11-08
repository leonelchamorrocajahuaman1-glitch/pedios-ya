"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { useRun } from "./use-run";
import { purgeDemoAction } from "@/lib/actions/admin";

export function DemoPurge({ counts }: { counts: { products: number; promotions: number; coupons: number } }) {
  const { run } = useRun();
  const total = counts.products + counts.promotions + counts.coupons;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-xl text-sm text-muted">
        Hay {counts.products} productos, {counts.promotions} promociones y {counts.coupons} cupones marcados como <strong>DEMO</strong>.
        Al eliminarlos no se tocan tus productos reales ni los pedidos (conservan nombre, precio y cantidad). Los cupones ya usados se conservan.
      </p>
      <ConfirmButton
        variant="danger"
        disabled={total === 0}
        title="¿Eliminar los datos de demostración?"
        description="Se borrarán solo los registros marcados como DEMO. Esta acción no se puede deshacer."
        confirmLabel="Eliminar demo"
        onConfirm={() => run(() => purgeDemoAction())}
      >
        Eliminar datos demo
      </ConfirmButton>
    </div>
  );
}
