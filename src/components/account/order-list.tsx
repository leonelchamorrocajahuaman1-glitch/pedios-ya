import Link from "next/link";
import { ChevronRight, Store, Truck } from "lucide-react";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/pedidos/${o.id}`} className="block rounded-3xl border border-border bg-surface p-4 transition hover:border-brand/50 hover:shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold">{o.code}</span>
              <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              <Badge tone={PAYMENT_STATUS_TONE[o.payment_status]}>{PAYMENT_METHOD_LABEL[o.payment_method]} · {PAYMENT_STATUS_LABEL[o.payment_status]}</Badge>
              <span className="ml-auto font-display text-lg font-bold">{formatPEN(o.total)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex -space-x-3">
                {o.order_items?.slice(0, 4).map((i) => (
                  <span key={i.id} className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-surface bg-surface-2"><SmartImage src={i.product_image} alt="" fill sizes="44px" className="object-cover" /></span>
                ))}
              </div>
              <p className="min-w-0 flex-1 truncate text-sm text-muted">{o.order_items?.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              {o.fulfillment === "pickup" ? <Store className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />} {formatDateTime(o.created_at)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
