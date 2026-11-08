"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Plus, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { buttonStyles } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSelectedAddress } from "@/hooks/use-selected-address";
import type { Address } from "@/types";
import { cn } from "@/lib/utils";

/** Selector de dirección de entrega (las direcciones viven en Supabase, protegidas por RLS). */
export function AddressPicker({ userId, className }: { userId: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const { addressId, setAddressId } = useSelectedAddress();

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at")
      .then(({ data }) => {
        const list = (data ?? []) as Address[];
        setAddresses(list);
        if (list.length && (!addressId || !list.some((a) => a.id === addressId))) setAddressId(list[0].id);
      });
  }, [userId, open, addressId, setAddressId]);

  const current = addresses?.find((a) => a.id === addressId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-left transition hover:bg-surface-2", className)}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] leading-tight text-muted">Entregar en</span>
          <span className="flex items-center gap-1 truncate text-sm font-semibold leading-tight">
            <span className="truncate">{current ? `${current.label} · ${current.street}` : userId ? "Elige una dirección" : "Lima, Perú"}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </span>
        </span>
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="¿Dónde entregamos?" size="sm">
        <div className="space-y-3 p-5">
          {!userId ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted">Inicia sesión para guardar tus direcciones y calcular el envío exacto.</p>
              <Link href="/login" className={buttonStyles({ variant: "primary" })} onClick={() => setOpen(false)}>
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              {addresses === null && <p className="py-6 text-center text-sm text-muted">Cargando…</p>}
              {addresses?.length === 0 && <p className="py-4 text-center text-sm text-muted">Aún no tienes direcciones guardadas.</p>}
              {addresses?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAddressId(a.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-brand",
                    a.id === addressId ? "border-brand bg-brand/5" : "border-border",
                  )}
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{a.label}</span>
                    <span className="block text-sm text-muted">
                      {a.street}
                      {a.district && `, ${a.district}`}
                    </span>
                  </span>
                  {a.id === addressId && <Check className="h-5 w-5 text-brand" />}
                </button>
              ))}
              <Link
                href="/cuenta/direcciones"
                onClick={() => setOpen(false)}
                className={cn(buttonStyles({ variant: "outline" }), "w-full")}
              >
                <Plus className="h-4 w-4" /> Gestionar direcciones
              </Link>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
