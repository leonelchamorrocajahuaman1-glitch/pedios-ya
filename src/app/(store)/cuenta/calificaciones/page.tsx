import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { getMyOrders, getMyReviews } from "@/lib/services/account";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { hasReview } from "@/types";

export const metadata: Metadata = { title: "Mis calificaciones" };

export default async function ReviewsPage() {
  const [reviews, orders] = await Promise.all([getMyReviews(), getMyOrders(30)]);
  const pending = orders.filter((o) => o.status === "delivered" && !hasReview(o));
  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Pendientes de calificar</h2>
          <ul className="space-y-2">
            {pending.map((o) => (
              <li key={o.id}>
                <Link href={`/pedidos/${o.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm hover:border-brand">
                  <span><strong>{o.restaurants?.name}</strong> · {o.code}</span>
                  <span className="font-semibold text-brand">Calificar →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Tus calificaciones</h2>
        {reviews.length === 0 ? (
          <EmptyState icon={<Star />} title="Aún no calificaste pedidos" description="Después de cada entrega podrás calificar al restaurante." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-3xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <Link href={`/restaurante/${r.restaurants?.slug}`} className="font-semibold hover:text-brand">{r.restaurants?.name}</Link>
                  <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                </div>
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={i < r.rating ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4 text-border"} />)}
                </div>
                {r.comment && <p className="mt-2 text-sm text-muted">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
