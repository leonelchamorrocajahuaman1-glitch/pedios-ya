"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Línea del carrito. El precio es referencial: el total real lo calcula la base de datos. */
export interface CartItem {
  product_id: string;
  slug: string;
  name: string;
  image_url: string | null;
  price: number;
  stock: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  coupon: string | null;
}

interface CartContextValue extends CartState {
  ready: boolean;
  count: number;
  estimatedSubtotal: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => number;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  quantityOf: (productId: string) => number;
  /** Ajusta precios y stock con la cotización del servidor */
  syncFromServer: (lines: { product_id: string; unit_price: number; stock: number }[]) => void;
}

const STORAGE_KEY = "huaytalla.cart.v1";
const EMPTY: CartState = { items: [], coupon: null };
const MAX_PER_ITEM = 99;
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        // Hidratación desde localStorage tras el montaje (no rompe el SSR).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed.items)) setState({ items: parsed.items.filter((i) => i.product_id && i.quantity > 0), coupon: parsed.coupon ?? null });
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

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        setState(JSON.parse(e.newValue));
      } catch {
        /* ignorar */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const cap = (q: number, stock: number) => Math.max(0, Math.min(q, stock, MAX_PER_ITEM));

  const add = useCallback<CartContextValue["add"]>((item, quantity = 1) => {
    let result = 0;
    setState((s) => {
      const existing = s.items.find((i) => i.product_id === item.product_id);
      const qty = cap((existing?.quantity ?? 0) + quantity, item.stock);
      result = qty;
      const items = existing
        ? s.items.map((i) => (i.product_id === item.product_id ? { ...i, ...item, quantity: qty } : i))
        : [...s.items, { ...item, quantity: qty }];
      return { ...s, items: items.filter((i) => i.quantity > 0) };
    });
    return result;
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.product_id === productId ? { ...i, quantity: cap(quantity, i.stock) } : i)).filter((i) => i.quantity > 0),
    }));
  }, []);

  const remove = useCallback((productId: string) => setState((s) => ({ ...s, items: s.items.filter((i) => i.product_id !== productId) })), []);
  const clear = useCallback(() => setState(EMPTY), []);
  const setCoupon = useCallback((coupon: string | null) => setState((s) => ({ ...s, coupon })), []);

  const syncFromServer = useCallback<CartContextValue["syncFromServer"]>((lines) => {
    setState((s) => {
      let changed = false;
      const items = s.items.map((i) => {
        const l = lines.find((x) => x.product_id === i.product_id);
        if (!l || (Number(l.unit_price) === i.price && l.stock === i.stock)) return i;
        changed = true;
        return { ...i, price: Number(l.unit_price), stock: l.stock };
      });
      return changed ? { ...s, items } : s;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.items.reduce((n, i) => n + i.quantity, 0);
    const estimatedSubtotal = state.items.reduce((n, i) => n + i.price * i.quantity, 0);
    return {
      ...state,
      ready,
      count,
      estimatedSubtotal,
      add,
      setQuantity,
      remove,
      clear,
      setCoupon,
      syncFromServer,
      quantityOf: (id: string) => state.items.find((i) => i.product_id === id)?.quantity ?? 0,
    };
  }, [state, ready, add, setQuantity, remove, clear, setCoupon, syncFromServer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

/** Payload para store_quote / store_place_order: solo IDs y cantidades (los precios los pone la BD). */
export function toOrderItems(items: CartItem[]) {
  return items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
}
