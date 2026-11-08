import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase/admin";
import type { Courier } from "@/types";

/** Token del enlace personal del repartidor: solo se guarda su hash SHA-256. */
export function generateCourierToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashCourierToken(token) };
}

export function hashCourierToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findCourierByToken(token: string): Promise<Courier | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("couriers").select("*").eq("access_token_hash", hashCourierToken(token)).maybeSingle();
  const courier = data as Courier | null;
  if (!courier || courier.status !== "active") return null;
  return courier;
}
