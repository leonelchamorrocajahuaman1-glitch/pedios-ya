import type { DiscountType, MovementType, OrderStatus, PaymentMethod, PaymentStatus, ProductUnit } from "@/types";

export const BRAND = {
  name: "MULTIPRODUCTOS HUAYTALLA",
  short: "Huaytalla",
  slogan: "Todo lo que necesitas, en un solo lugar",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Pendiente",
  accepted: "Confirmado",
  preparing: "Preparando",
  ready: "Listo para entregar",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Texto para el cliente en el seguimiento */
export const ORDER_STATUS_CUSTOMER: Record<OrderStatus, string> = {
  received: "Recibimos tu pedido",
  accepted: "Pedido confirmado",
  preparing: "Estamos preparando tu pedido",
  ready: "Tu pedido está listo",
  on_the_way: "Tu pedido va en camino",
  delivered: "Pedido entregado",
  cancelled: "Pedido cancelado",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warning" | "success" | "danger" | "brand" | "accent"> = {
  received: "warning",
  accepted: "info",
  preparing: "accent",
  ready: "brand",
  on_the_way: "brand",
  delivered: "success",
  cancelled: "danger",
};

export const FLOW_DELIVERY: OrderStatus[] = ["received", "accepted", "preparing", "ready", "on_the_way", "delivered"];
export const FLOW_PICKUP: OrderStatus[] = ["received", "accepted", "preparing", "ready", "delivered"];

export function nextStatus(status: OrderStatus, fulfillment: "delivery" | "pickup"): OrderStatus | null {
  const flow = fulfillment === "pickup" ? FLOW_PICKUP : FLOW_DELIVERY;
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  pending_verification: "Por verificar",
  approved: "Verificado",
  rejected: "Rechazado",
  refunded: "Reembolsado",
  cancelled: "Anulado",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  pending: "neutral",
  pending_verification: "warning",
  approved: "success",
  rejected: "danger",
  refunded: "info",
  cancelled: "neutral",
};

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: "Porcentaje",
  fixed: "Monto fijo",
  free_delivery: "Delivery gratis",
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
  sale: "Venta",
  sale_cancel: "Anulación de venta",
};

export const UNITS: { value: ProductUnit; label: string }[] = [
  { value: "unidad", label: "Unidad" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramos (g)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "paquete", label: "Paquete" },
  { value: "caja", label: "Caja" },
  { value: "docena", label: "Docena" },
  { value: "bolsa", label: "Bolsa" },
  { value: "lata", label: "Lata" },
  { value: "botella", label: "Botella" },
  { value: "six pack", label: "Six pack" },
];

export const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
