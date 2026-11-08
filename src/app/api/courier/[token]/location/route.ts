import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findCourierByToken } from "@/lib/courier";
import { getSupabaseServiceClient } from "@/lib/supabase/admin";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(100).nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const courier = await findCourierByToken((await params).token);
  if (!courier) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
  if (!courier.location_consent) return NextResponse.json({ error: "Debes autorizar el seguimiento" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
  // Limita la frecuencia: como máximo una posición cada 4 segundos
  if (courier.last_seen_at && Date.now() - new Date(courier.last_seen_at).getTime() < 4000) {
    return NextResponse.json({ ok: true, throttled: true });
  }
  const { data, error } = await getSupabaseServiceClient().rpc("courier_report_location", {
    p_courier_id: courier.id,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_heading: parsed.data.heading ?? null,
    p_speed: parsed.data.speed ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, orders: data });
}
