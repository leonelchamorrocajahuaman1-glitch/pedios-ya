import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getMyOrders } from "@/lib/services/account";
import { OrderList } from "@/components/account/order-list";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mis pedidos" };

export default async function MyOrdersPage() {
  const orders = await getMyOrders();
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  if (!orders.length) {
    return <EmptyState icon={<ClipboardList />} title="Aún no tienes pedidos" description="Cuando compres, podrás seguir tu pedido aquí en tiempo real." action={<Link href="/productos" className={buttonStyles()}>Empezar a comprar</Link>} />;
  }
  return (
    <div className="space-y-8">
      {/* Los cambios de estado llegan en tiempo real (RLS: solo los pedidos propios) */}
      <LiveRefresh notifyInsert={false} />
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">En curso</h2>
          <OrderList orders={active} />
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Historial de compras</h2>
        {past.length ? <OrderList orders={past} /> : <p className="text-sm text-muted">Todavía no tienes pedidos finalizados.</p>}
      </section>
    </div>
  );
}
