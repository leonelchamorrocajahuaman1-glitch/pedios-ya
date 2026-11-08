"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SelectedOption } from "@/types";

export interface CartRestaurant {
  id: string;
  slug: string;
  name: string;
  delivery_fee: number;
  min_order_amount: number;
  logo_url: string | null;
}

export interface CartItem {
  key: string;
  product_id: string;
  name: string;
  image_url: string | null;
  unit_price: number;
  options: SelectedOption[];
  quantity: number;
  notes?: string;
  max_stock: number | null;
}

interface CartState {
  restaurant: CartRestaurant | null;
  items: CartItem[];
  coupon: string | null;
}

interface CartContextValue extends CartState {
  ready: boolean;
  count: number;
  /** Subtotal estimado en el navegador. El total definitivo lo calcula la base de datos. */
  estimatedSubtotal: number;
  add: (restaurant: CartRestaurant, item: Omit<CartItem, "key">) => "added" | "conflict";
  replaceWith: (restaurant: CartRestaurant, item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
}

const STORAGE_KEY = "mikuy.cart.v1";
const EMPTY: CartState = { restaurant: null, items: [], coupon: null };

const CartContext = createContext<CartContextValue | null>(null);

export function itemKey(productId: string, options: SelectedOption[], notes?: string) {
  const opts = [...options].map((o) => `${o.group}:${o.choice}`).sort().join("|");
  return `${productId}#${opts}#${(notes ?? "").trim()}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        // Hidratación desde localStorage: debe ocurrir tras el montaje para no romper el SSR.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed.items)) setState(parsed);
      }
    } catch {
      /* almacenamiento no disponible */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignorar */
    }
  }, [state, ready]);

  // Sincroniza entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {
          /* ignorar */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mergeItem = (items: CartItem[], item: Omit<CartItem, "key">): CartItem[] => {
    const key = itemKey(item.product_id, item.options, item.notes);
    const existing = items.find((i) => i.key === key);
    const cap = (q: number) => Math.min(q, item.max_stock ?? 50, 50);
    if (existing) return items.map((i) => (i.key === key ? { ...i, quantity: cap(i.quantity + item.quantity) } : i));
    return [...items, { ...item, key, quantity: cap(item.quantity) }];
  };

  const add = useCallback<CartContextValue["add"]>(
    (restaurant, item) => {
      if (state.restaurant && state.restaurant.id !== restaurant.id && state.items.length > 0) return "conflict";
      setState((s) => ({ ...s, restaurant, items: mergeItem(s.restaurant?.id === restaurant.id ? s.items : [], item) }));
      return "added";
    },
    [state.restaurant, state.items.length],
  );

  const replaceWith = useCallback<CartContextValue["replaceWith"]>((restaurant, item) => {
    setState({ restaurant, items: mergeItem([], item), coupon: null });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setState((s) => {
      const items = s.items
        .map((i) => (i.key === key ? { ...i, quantity: Math.max(0, Math.min(quantity, i.max_stock ?? 50, 50)) } : i))
        .filter((i) => i.quantity > 0);
      return items.length ? { ...s, items } : EMPTY;
    });
  }, []);

  const remove = useCallback((key: string) => {
    setState((s) => {
      const items = s.items.filter((i) => i.key !== key);
      return items.length ? { ...s, items } : EMPTY;
    });
  }, []);

  const clear = useCallback(() => setState(EMPTY), []);
  const setCoupon = useCallback((coupon: string | null) => setState((s) => ({ ...s, coupon })), []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.items.reduce((n, i) => n + i.quantity, 0);
    const estimatedSubtotal = state.items.reduce(
      (n, i) => n + (i.unit_price + i.options.reduce((a, o) => a + o.price, 0)) * i.quantity,
      0,
    );
    return { ...state, ready, count, estimatedSubtotal, add, replaceWith, setQuantity, remove, clear, setCoupon };
  }, [state, ready, add, replaceWith, setQuantity, remove, clear, setCoupon]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

/** Payload para quote_order / place_order (solo IDs y elecciones; los precios los pone la BD). */
export function toOrderItems(items: CartItem[]) {
  return items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    options: i.options.map((o) => ({ group: o.group, choice: o.choice })),
    notes: i.notes || undefined,
  }));
}
