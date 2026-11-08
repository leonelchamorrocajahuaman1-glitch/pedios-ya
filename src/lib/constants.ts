import type { DiscountType, OrderStatus, PaymentMethod, PaymentStatus, RestaurantStatus } from "@/types";

export const BRAND = {
  name: "Mikuy",
  tagline: "Lo que se te antoje, en minutos",
  meaning: "«Mikuy» significa «comer» en quechua.",
};

/** Flujo de seguimiento (7 etapas) */
export const ORDER_FLOW: OrderStatus[] = [
  "received",
  "accepted",
  "preparing",
  "courier_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Pedido recibido",
  accepted: "Restaurante aceptó",
  preparing: "Preparando pedido",
  courier_assigned: "Repartidor asignado",
  picked_up: "Repartidor recogió el pedido",
  on_the_way: "Pedido en camino",
  delivered: "Pedido entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warning" | "success" | "danger" | "brand"> = {
  received: "info",
  accepted: "info",
  preparing: "warning",
  courier_assigned: "brand",
  picked_up: "brand",
  on_the_way: "brand",
  delivered: "success",
  cancelled: "danger",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  pending_verification: "Por verificar",
  approved: "Confirmado",
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

export const RESTAURANT_STATUS_LABEL: Record<RestaurantStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  suspended: "Suspendido",
  rejected: "Rechazado",
};

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: "Porcentaje",
  fixed: "Monto fijo",
  free_delivery: "Envío gratis",
};

export const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const LIMA_CENTER = { lat: -12.1211, lng: -77.0297 };
