import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findCourierByToken } from "@/lib/courier";
import { getSupabaseServiceClient } from "@/lib/supabase/admin";

const schema = z.object({ order_id: z.uuid(), status: z.enum(["picked_up", "on_the_way", "delivered"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const courier = await findCourierByToken((await params).token);
  if (!courier) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { error } = await getSupabaseServiceClient().rpc("courier_advance_order", {
    p_courier_id: courier.id,
    p_order_id: parsed.data.order_id,
    p_status: parsed.data.status,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
