import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RestaurantForm } from "@/components/admin/restaurant-form";
import { StatCard } from "@/components/admin/stat-card";
import { buttonStyles } from "@/components/ui/button";
import { formatPEN } from "@/lib/format";
import type { Category, PlatformSettings, Restaurant } from "@/types";

export const metadata: Metadata = { title: "Restaurante" };

export default async function AdminRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "nuevo";
  if (!isNew && !z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: settings }, restaurantRes, linksRes, salesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("platform_settings").select("default_commission_rate").eq("id", 1).single(),
    isNew ? Promise.resolve({ data: null }) : supabase.from("restaurants").select("*").eq("id", id).maybeSingle(),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("restaurant_categories").select("category_id").eq("restaurant_id", id),
    isNew ? Promise.resolve({ data: [] }) : supabase.rpc("admin_restaurant_sales"),
  ]);
  if (!isNew && !restaurantRes.data) notFound();
  const r = restaurantRes.data as Restaurant | null;
  const s = ((salesRes.data ?? []) as { restaurant_id: string; orders: number; delivered: number; sales: number; commission: number }[]).find((x) => x.restaurant_id === id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/restaurantes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Restaurantes</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{r ? r.name : "Nuevo restaurante"}</h1>
        {r && <Link href={`/admin/productos?restaurante=${r.id}`} className={buttonStyles({ variant: "outline" })}><Package className="h-4 w-4" /> Ver productos</Link>}
      </div>
      {r && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pedidos" value={String(s?.orders ?? 0)} hint={`${s?.delivered ?? 0} entregados`} />
          <StatCard label="Ventas" value={formatPEN(s?.sales ?? 0)} />
          <StatCard label="Comisiones generadas" value={formatPEN(s?.commission ?? 0)} />
        </div>
      )}
      <RestaurantForm
        restaurant={r ?? undefined}
        categories={(categories ?? []) as Category[]}
        selectedCategories={((linksRes.data ?? []) as { category_id: string }[]).map((l) => l.category_id)}
        defaultCommission={Number((settings as Pick<PlatformSettings, "default_commission_rate"> | null)?.default_commission_rate ?? 0.15)}
      />
    </div>
  );
}
