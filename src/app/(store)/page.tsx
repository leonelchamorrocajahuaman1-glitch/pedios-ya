import { BadgePercent, Flame, LayoutGrid, Sparkles, Star, Ticket } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { CategoryGrid } from "@/components/home/category-grid";
import { PromoBanners } from "@/components/home/promo-banners";
import { CouponCard } from "@/components/home/coupon-card";
import { DeliveryInfo } from "@/components/home/delivery-info";
import { ProductRail } from "@/components/store/product-card";
import { Section } from "@/components/store/section";
import { StaggerReveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryTree, getHomeData, getPaymentMethods, getStoreSettings } from "@/lib/services/store";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, settings, categories, home, methods] = await Promise.all([
    searchParams,
    getStoreSettings(),
    getCategoryTree(),
    getHomeData(),
    getPaymentMethods(),
  ]);
  if (!settings) return <EmptyState className="m-8" title="La tienda aún no está configurada" />;

  return (
    <>
      {error === "forbidden" && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">No tienes permisos para acceder al panel administrativo.</p>
        </div>
      )}
      <Hero slogan={settings.welcome_message || settings.slogan} deliveryEta={settings.delivery_eta} freeFrom={settings.free_delivery_threshold} />

      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6">
        <Section title="Categorías" icon={<LayoutGrid />} href="/productos" linkLabel="Ver catálogo">
          {categories.length ? <CategoryGrid categories={categories} /> : <EmptyState title="Aún no hay categorías" />}
        </Section>

        <PromoBanners promotions={home.promotions} freeFrom={settings.free_delivery_threshold} />

        {home.offers.length > 0 && (
          <Section id="ofertas" title="Ofertas especiales" subtitle="Descuentos vigentes por tiempo limitado" icon={<BadgePercent />} href="/productos?ofertas=1">
            <ProductRail products={home.offers} />
          </Section>
        )}

        <Section title="Productos destacados" subtitle="Seleccionados para ti" icon={<Star />} href="/productos?destacados=1">
          {home.featured.length ? <ProductRail products={home.featured} /> : <EmptyState title="Pronto tendremos productos destacados" />}
        </Section>

        <Section
          title="Los más vendidos"
          subtitle={home.bestFromSales ? "Lo que más compran nuestros clientes" : "Nuestros favoritos mientras se acumulan las ventas"}
          icon={<Flame />}
          href="/productos"
        >
          <ProductRail products={home.bestSellers} />
        </Section>

        {home.coupons.length > 0 && (
          <Section title="Cupones para ti" subtitle="Toca un cupón para aplicarlo a tu carrito" icon={<Ticket />}>
            <StaggerReveal className="grid gap-4 sm:grid-cols-2">
              {home.coupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
            </StaggerReveal>
          </Section>
        )}

        <Section title="Recién llegados" subtitle="Lo nuevo en nuestras góndolas" icon={<Sparkles />} href="/productos?orden=nuevos">
          <ProductRail products={home.newest} />
        </Section>

        <DeliveryInfo settings={settings} methods={methods.map((m) => m.name)} />
      </div>
    </>
  );
}
