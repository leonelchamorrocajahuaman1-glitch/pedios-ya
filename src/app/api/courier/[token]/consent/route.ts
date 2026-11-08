import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findCourierByToken } from "@/lib/courier";
import { getSupabaseServiceClient } from "@/lib/supabase/admin";

const schema = z.object({ consent: z.boolean().optional(), available: z.boolean().optional() });

/** El repartidor autoriza o revoca el seguimiento de su ubicación y su disponibilidad. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const courier = await findCourierByToken((await params).token);
  if (!courier) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (parsed.data.consent !== undefined) {
    patch.location_consent = parsed.data.consent;
    patch.location_consent_at = parsed.data.consent ? new Date().toISOString() : null;
    if (!parsed.data.consent) Object.assign(patch, { last_lat: null, last_lng: null });
  }
  if (parsed.data.available !== undefined) patch.is_available = parsed.data.available;
  const { error } = await getSupabaseServiceClient().from("couriers").update(patch).eq("id", courier.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
