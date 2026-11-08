"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "mikuy.address";
const EVENT = "mikuy:address";

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Dirección de entrega elegida (solo el ID; los datos se leen de Supabase). */
export function useSelectedAddress() {
  const addressId = useSyncExternalStore(subscribe, read, () => null);
  const setAddressId = useCallback((id: string | null) => {
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignorar */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { addressId, setAddressId };
}
