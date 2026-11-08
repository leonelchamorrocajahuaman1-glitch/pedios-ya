import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Store, Ticket } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { CategoryRail } from "@/components/home/category-rail";
import { RestaurantCard } from "@/components/home/restaurant-card";
import { PopularProductCard } from "@/components/home/product-card";
import { PromoBanner } from "@/components/home/promo-banner";
import { CouponCard } from "@/components/home/coupon-card";
import { NearbyRestaurants } from "@/components/home/nearby-restaurants";
import { StaggerReveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { getCategories, getPopularProducts, getPublicCoupons, getRestaurants } from "@/lib/services/catalog";
import { getFavoriteIds } from "@/lib/services/account";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function SectionTitle({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="text-brand">{icon}</span> {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline sm:inline-flex">
          Ver todo <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, session, categories, restaurants, popular, coupons] = await Promise.all([
    searchParams,
    getSession(),
    getCategories(),
    getRestaurants(),
    getPopularProducts(8),
    getPublicCoupons(),
  ]);
  const favoriteIds = await getFavoriteIds(session?.userId);
  const featured = restaurants.filter((r) => r.is_featured).slice(0, 6);
  const openCount = restaurants.filter((r) => r.is_open).length;

  return (
    <>
      {error === "forbidden" && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            No tienes permisos para acceder al panel administrativo.
          </p>
        </div>
      )}
      <Hero restaurantCount={openCount} />

      <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6">
        <section aria-labelledby="categorias">
          <SectionTitle icon={<Sparkles className="h-6 w-6" />} title="¿Qué se te antoja?" />
          {categories.length ? <CategoryRail categories={categories} /> : <EmptyState title="Aún no hay categorías" />}
        </section>

        <section>
          <SectionTitle icon={<Store className="h-6 w-6" />} title="Restaurantes destacados" subtitle="Los favoritos de la comunidad" href="/buscar" />
          {featured.length ? (
            <StaggerReveal className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} canFavorite={Boolean(session)} isFavorite={favoriteIds.includes(r.id)} />
              ))}
            </StaggerReveal>
          ) : (
            <EmptyState icon={<Store />} title="Todavía no hay restaurantes" description="Cuando el administrador apruebe negocios aparecerán aquí." />
          )}
        </section>

        <section id="promociones" className="scroll-mt-28">
          <SectionTitle icon={<Ticket className="h-6 w-6" />} title="Ofertas y promociones" subtitle="Toca un cupón para aplicarlo a tu carrito" />
          {coupons.length ? (
            <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
            </StaggerReveal>
          ) : (
            <EmptyState icon={<Ticket />} title="Sin promociones activas" description="Vuelve pronto: publicamos nuevas ofertas cada semana." />
          )}
        </section>

        <PromoBanner />

        <section>
          <SectionTitle icon={<Flame className="h-6 w-6" />} title="Productos populares" subtitle="Lo más pedido esta semana" />
          {popular.length ? (
            <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {popular.map((p) => <PopularProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <EmptyState icon={<Flame />} title="Aún no hay productos populares" />
          )}
        </section>

        <section>
          <SectionTitle icon={<Store className="h-6 w-6" />} title="Restaurantes cercanos" href="/buscar" />
          {restaurants.length ? (
            <NearbyRestaurants restaurants={restaurants} favoriteIds={favoriteIds} canFavorite={Boolean(session)} />
          ) : (
            <EmptyState title="No hay negocios disponibles" />
          )}
          <div className="mt-8 text-center">
            <Link href="/buscar" className={buttonStyles({ variant: "outline" })}>
              Ver todos los negocios <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
