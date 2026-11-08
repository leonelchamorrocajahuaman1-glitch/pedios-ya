import { Clock, CreditCard, MapPin, Store, Truck } from "lucide-react";
import type { OpeningHour, StoreSettings } from "@/types";
import { DAYS } from "@/lib/constants";
import { formatPEN } from "@/lib/format";

export function hoursSummary(hours: OpeningHour[]) {
  const open = hours.filter((h) => !h.closed);
  if (!open.length) return "Consulta nuestros horarios";
  const same = open.every((h) => h.open === open[0].open && h.close === open[0].close);
  if (same && open.length === 7) return `Todos los días de ${open[0].open} a ${open[0].close}`;
  return open.map((h) => `${DAYS[h.day].slice(0, 3)} ${h.open}–${h.close}`).join(" · ");
}

export function DeliveryInfo({ settings, methods }: { settings: StoreSettings; methods: string[] }) {
  const items = [
    { icon: Truck, title: settings.delivery_enabled ? `Delivery desde ${formatPEN(settings.delivery_fee)}` : "Delivery no disponible", text: settings.free_delivery_threshold ? `Gratis en compras desde ${formatPEN(settings.free_delivery_threshold)}. Llega en ${settings.delivery_eta}.` : `Llega en ${settings.delivery_eta}.` },
    { icon: Store, title: settings.pickup_enabled ? "Recojo en tienda gratis" : "Solo delivery", text: settings.address ? `${settings.address}${settings.district ? `, ${settings.district}` : ""}` : "Te avisamos cuando tu pedido esté listo." },
    { icon: Clock, title: "Horario de atención", text: hoursSummary(settings.opening_hours) },
    { icon: CreditCard, title: "Paga como prefieras", text: methods.join(", ") || "Efectivo" },
  ];
  return (
    <div className="grid gap-4 rounded-[2rem] border border-border bg-surface p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand"><Icon className="h-6 w-6" /></span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted">{text}</p>
          </div>
        </div>
      ))}
      {settings.min_order_amount > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted sm:col-span-2 lg:col-span-4"><MapPin className="h-3.5 w-3.5" /> Compra mínima: {formatPEN(settings.min_order_amount)}</p>
      )}
    </div>
  );
}
