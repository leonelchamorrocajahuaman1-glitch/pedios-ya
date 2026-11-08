"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PROOF_MAX, PROOF_TYPES } from "@/components/checkout/wallet-payment";

/** Sube el comprobante al bucket privado, en la carpeta del propio usuario (RLS lo exige). */
export async function uploadPaymentProof(userId: string, file: File): Promise<{ path?: string; error?: string }> {
  if (!PROOF_TYPES.includes(file.type)) return { error: "Formato no permitido. Usa JPG, PNG, WebP o PDF." };
  if (file.size > PROOF_MAX) return { error: "El comprobante supera 5 MB." };
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await getSupabaseBrowserClient().storage.from("payment-proofs").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `No se pudo subir el comprobante: ${error.message}` };
  return { path };
}
