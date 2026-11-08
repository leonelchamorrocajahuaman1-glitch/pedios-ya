"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Refresca la vista del admin cuando entran o cambian pedidos de la tienda (Realtime + RLS admin). */
export function LiveRefresh({ table = "orders", notifyInsert = true }: { table?: string; notifyInsert?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`admin-live-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(table === "orders" ? { filter: "catalog=eq.store" } : {}) }, (payload) => {
        if (notifyInsert && payload.eventType === "INSERT" && table === "orders") {
          toast.success(`Nuevo pedido ${(payload.new as { code?: string }).code ?? ""}`);
        }
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 600);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router, table, notifyInsert]);
  return null;
}
