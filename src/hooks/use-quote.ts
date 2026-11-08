"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/errors";
import { toOrderItems, type CartItem } from "./use-cart";
import type { OrderQuote } from "@/types";

/**
 * Cotiza el carrito en la base de datos (quote_order): precios, envío por distancia,
 * cupón y stock reales. Se recalcula con debounce cuando algo cambia.
 */
export function useQuote(params: {
  restaurantId: string | null;
  items: CartItem[];
  coupon: string | null;
  addressId?: string | null;
  enabled?: boolean;
}) {
  const { restaurantId, items, coupon, addressId, enabled = true } = params;
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const active = Boolean(enabled && restaurantId && items.length > 0);
  const signature = JSON.stringify([restaurantId, toOrderItems(items), coupon, addressId]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const run = (code: string | null) =>
        supabase.rpc("quote_order", {
          p_restaurant_id: restaurantId,
          p_items: toOrderItems(items),
          p_coupon_code: code,
          p_address_id: addressId ?? null,
        });
      let { data, error: err } = await run(coupon);
      let cErr: string | null = null;
      // Si el problema es el cupón, cotizamos sin él y mostramos el motivo
      if (err && coupon && (err.hint ?? "").startsWith("COUPON")) {
        cErr = toUserMessage(err);
        ({ data, error: err } = await run(null));
      }
      if (cancelled) return;
      setCouponError(cErr);
      if (err) {
        setError(toUserMessage(err));
        setQuote(null);
      } else {
        setError(null);
        setQuote(data as OrderQuote);
      }
      setLoading(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled]);

  return active ? { quote, error, couponError, loading } : { quote: null, error: null, couponError: null, loading: false };
}
