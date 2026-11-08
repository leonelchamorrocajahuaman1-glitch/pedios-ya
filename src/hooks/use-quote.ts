"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/errors";
import { toOrderItems, useCart, type CartItem } from "./use-cart";
import type { CartQuote, Fulfillment } from "@/types";

/**
 * Cotiza el carrito en la base de datos (store_quote): precios con promociones,
 * stock, delivery, compra mínima y cupón reales. Recalcula con debounce.
 */
export function useQuote(params: { items: CartItem[]; coupon: string | null; fulfillment: Fulfillment; addressId?: string | null; enabled?: boolean }) {
  const { items, coupon, fulfillment, addressId, enabled = true } = params;
  const { syncFromServer } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const active = Boolean(enabled && items.length > 0);
  const signature = JSON.stringify([toOrderItems(items), coupon, fulfillment, addressId]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const run = (code: string | null) =>
        supabase.rpc("store_quote", {
          p_items: toOrderItems(items),
          p_coupon_code: code,
          p_fulfillment: fulfillment,
          p_address_id: addressId ?? null,
        });
      let { data, error: err } = await run(coupon);
      let cErr: string | null = null;
      if (err && coupon && (err.hint ?? "").startsWith("COUPON")) {
        cErr = toUserMessage(err);
        ({ data, error: err } = await run(null));
      }
      if (cancelled) return;
      setCouponError(cErr);
      if (err) {
        setError(toUserMessage(err));
        setErrorCode(err.hint ?? null);
        setQuote(null);
      } else {
        const q = data as CartQuote;
        setError(null);
        setErrorCode(null);
        setQuote(q);
        syncFromServer(q.lines);
      }
      setLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, active]);

  return active
    ? { quote, error, errorCode, couponError, loading }
    : { quote: null, error: null, errorCode: null, couponError: null, loading: false };
}
