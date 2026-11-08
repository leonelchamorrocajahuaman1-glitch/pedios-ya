"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "@/types";
import { AddressForm } from "./address-form";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { deleteAddressAction } from "@/lib/actions/account";

export function AddressList({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Nueva dirección</Button>
      </div>
      {addresses.length === 0 ? (
        <EmptyState icon={<MapPin />} title="Sin direcciones guardadas" description="Agrega una dirección para calcular el envío exacto." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-3xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-brand" /> {a.label}</p>
                {a.is_default && <Badge tone="brand">Principal</Badge>}
              </div>
              <p className="mt-2 text-sm">{a.street}</p>
              <p className="text-sm text-muted">{a.district}, {a.city}</p>
              {a.reference && <p className="mt-1 text-xs text-muted">Ref.: {a.reference}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  title="¿Eliminar dirección?"
                  confirmLabel="Eliminar"
                  onConfirm={async () => {
                    const res = await deleteAddressAction(a.id);
                    if (!res.ok) toast.error(res.error);
                    else {
                      toast.success(res.message);
                      router.refresh();
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nueva dirección" : "Editar dirección"}>
        <div className="p-6">
          {editing !== null && (
            <AddressForm
              address={editing === "new" ? undefined : editing}
              onSaved={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
