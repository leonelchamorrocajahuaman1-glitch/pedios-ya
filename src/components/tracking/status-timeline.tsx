"use client";

import { motion } from "framer-motion";
import { Check, ChefHat, CircleCheck, ClipboardCheck, PackageCheck, ShoppingBag, Truck, XCircle } from "lucide-react";
import { FLOW_DELIVERY, FLOW_PICKUP, ORDER_STATUS_LABEL } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import type { Fulfillment, OrderStatus, OrderStatusHistory } from "@/types";
import { cn } from "@/lib/utils";

const ICONS: Record<OrderStatus, typeof Check> = {
  received: ShoppingBag,
  accepted: ClipboardCheck,
  preparing: ChefHat,
  ready: PackageCheck,
  on_the_way: Truck,
  delivered: CircleCheck,
  cancelled: XCircle,
};

export function StatusTimeline({ status, history, fulfillment }: { status: OrderStatus; history: OrderStatusHistory[]; fulfillment: Fulfillment }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-danger/10 p-4 text-danger">
        <XCircle className="h-6 w-6" /> <p className="font-semibold">Este pedido fue cancelado.</p>
      </div>
    );
  }
  const flow = fulfillment === "pickup" ? FLOW_PICKUP : FLOW_DELIVERY;
  const current = flow.indexOf(status);
  const at = (s: OrderStatus) => history.filter((h) => h.status === s).at(-1)?.created_at;
  return (
    <ol className="space-y-1">
      {flow.map((s, i) => {
        const Icon = ICONS[s];
        const done = i < current;
        const active = i === current;
        const time = at(s);
        return (
          <li key={s} className="relative flex items-start gap-4 pb-5 last:pb-0">
            {i < flow.length - 1 && (
              <span className="absolute left-5 top-11 h-[calc(100%-2.25rem)] w-0.5 overflow-hidden bg-border">
                <motion.span className="block w-full bg-brand" initial={{ height: 0 }} animate={{ height: done ? "100%" : "0%" }} transition={{ duration: 0.6, delay: i * 0.05 }} />
              </span>
            )}
            <span className={cn("relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors", done && "border-brand bg-brand text-brand-fg", active && "border-brand bg-surface text-brand", !done && !active && "border-border bg-surface text-muted")}>
              {active && <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />}
              {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>
            <div className="pt-2">
              <p className={cn("text-sm font-semibold", !done && !active && "text-muted")}>{s === "delivered" && fulfillment === "pickup" ? "Recogido" : ORDER_STATUS_LABEL[s]}</p>
              {time && <p className="text-xs text-muted">{formatTime(time)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
