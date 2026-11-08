import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatDateTime, formatPEN } from "@/lib/format";

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/pedidos/${o.id}`} className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 transition hover:border-brand/50 hover:shadow-card">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
              <SmartImage src={o.restaurants?.logo_url} alt="" fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{o.restaurants?.name}</p>
                <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              </div>
              <p className="truncate text-sm text-muted">
                {o.order_items?.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
              </p>
              <p className="text-xs text-muted">{o.code} · {formatDateTime(o.created_at)} · {PAYMENT_METHOD_LABEL[o.payment_method]}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold">{formatPEN(o.total)}</p>
              <ChevronRight className="ml-auto h-5 w-5 text-muted" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
