"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Switch } from "@/components/ui/switch";
import { deleteProductAction, toggleProductAction } from "@/lib/actions/admin";
import { useRun } from "./use-run";
import type { Product } from "@/types";

export function ProductRowActions({ product, afterDelete }: { product: Pick<Product, "id" | "name" | "slug" | "is_available">; afterDelete?: string }) {
  const { pending, run } = useRun();
  const router = useRouter();
  const icon = "grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2";
  return (
    <div className="flex items-center justify-end gap-1">
      <Switch checked={product.is_available} disabled={pending} onChange={(v) => run(() => toggleProductAction(product.id, v))} />
      <Link href={`/producto/${product.slug}`} target="_blank" className={icon} aria-label="Ver en la tienda"><Eye className="h-4 w-4" /></Link>
      <Link href={`/admin/productos/${product.id}`} className={icon} aria-label="Editar"><Pencil className="h-4 w-4" /></Link>
      <ConfirmButton
        variant="ghost"
        size="icon"
        aria-label="Eliminar"
        title={`¿Eliminar «${product.name}»?`}
        description="Se borrará del catálogo y sus fotos de galería. Los pedidos anteriores conservan el nombre y el precio. Si solo quieres ocultarlo, desactívalo."
        confirmLabel="Eliminar"
        onConfirm={() => run(() => deleteProductAction(product.id), () => afterDelete && router.replace(afterDelete))}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </ConfirmButton>
    </div>
  );
}
