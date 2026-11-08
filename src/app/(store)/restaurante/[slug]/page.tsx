import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Bike, Clock, MapPin, Phone, ShoppingBag, Star } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { RestaurantMenu } from "@/components/restaurant/restaurant-menu";
import { FavoriteButton } from "@/components/restaurant/favorite-button";
import { getRestaurantBySlug } from "@/lib/services/catalog";
import { getFavoriteIds } from "@/lib/services/account";
import { getSession } from "@/lib/auth";
import { formatDate, formatHour, formatPEN } from "@/lib/format";
import { DAYS } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getRestaurantBySlug((await params).slug);
  if (!data) return { title: "Restaurante no encontrado" };
  return {
    title: `${data.restaurant.name} · Delivery`,
    description: data.restaurant.description,
    openGraph: { images: data.restaurant.cover_url ? [data.restaurant.cover_url] : [] },
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  const [data, session] = await Promise.all([getRestaurantBySlug(slug), getSession()]);
  if (!data) notFound();
  const { restaurant: r, products, reviews } = data;
  const favoriteIds = await getFavoriteIds(session?.userId);
  const open = Boolean(r.is_open);
  const allDays = r.open_days.length === 7;

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
        <SmartImage src={r.cover_url} alt={r.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative -mt-20 flex flex-col gap-5 rounded-[2rem] border border-border bg-surface p-5 shadow-card sm:-mt-24 sm:flex-row sm:items-end sm:p-7">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-surface bg-white shadow-lg sm:h-28 sm:w-28">
            <SmartImage src={r.logo_url} alt={`Logo de ${r.name}`} fill sizes="112px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{r.name}</h1>
              <Badge tone={open ? "success" : "danger"}>{open ? "Abierto ahora" : "Cerrado"}</Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted">{r.description}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm">
              <Rating value={r.rating_avg} count={r.rating_count} />
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted" /> {r.delivery_time_min}–{r.delivery_time_max} min</span>
              <span className="inline-flex items-center gap-1.5"><Bike className="h-4 w-4 text-muted" /> Envío desde {formatPEN(r.delivery_fee)}</span>
              {r.min_order_amount > 0 && (
                <span className="inline-flex items-center gap-1.5"><ShoppingBag className="h-4 w-4 text-muted" /> Mínimo {formatPEN(r.min_order_amount)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              <span>
                Horario: {formatHour(r.opens_at) === formatHour(r.closes_at) ? "24 horas" : `${formatHour(r.opens_at)} – ${formatHour(r.closes_at)}`}
                {!allDays && ` · ${r.open_days.map((d) => DAYS[d]).join(", ")}`}
              </span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {r.address}{r.district && `, ${r.district}`}</span>
              {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {r.phone}</span>}
            </div>
          </div>
          {session && <FavoriteButton restaurantId={r.id} initial={favoriteIds.includes(r.id)} className="absolute right-5 top-5 h-11 w-11" />}
        </div>

        {!open && (
          <p className="mt-4 rounded-2xl bg-warning/12 px-4 py-3 text-sm font-medium text-warning">
            Este negocio está cerrado en este momento. Puedes ver el menú; los pedidos se habilitan en su horario de atención.
          </p>
        )}

        <div className="mt-6">
          <Suspense>
            <RestaurantMenu
              products={products}
              isOpen={open}
              restaurant={{ id: r.id, slug: r.slug, name: r.name, delivery_fee: Number(r.delivery_fee), min_order_amount: Number(r.min_order_amount), logo_url: r.logo_url }}
            />
          </Suspense>
        </div>

        <section className="mt-14">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold"><Star className="h-5 w-5 text-warning" /> Opiniones recientes</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay opiniones de clientes verificados.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((rv) => (
                <div key={rv.id} className="rounded-3xl border border-border bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex gap-0.5" aria-label={`${rv.rating} de 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={i < rv.rating ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4 text-border"} />
                      ))}
                    </span>
                    <span className="text-xs text-muted">{formatDate(rv.created_at)}</span>
                  </div>
                  {rv.comment && <p className="mt-3 text-sm">{rv.comment}</p>}
                  <p className="mt-2 text-xs text-muted">Pedido verificado</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
