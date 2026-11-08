export type AppRole = "admin" | "customer";
export type AccountStatus = "active" | "suspended";
export type RestaurantStatus = "pending" | "approved" | "suspended" | "rejected";
export type OrderStatus =
  | "received"
  | "accepted"
  | "preparing"
  | "courier_assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cash" | "yape" | "plin" | "card";
export type PaymentStatus = "pending" | "pending_verification" | "approved" | "rejected" | "refunded" | "cancelled";
export type DiscountType = "percentage" | "fixed" | "free_delivery";
export type CourierStatus = "pending" | "active" | "suspended";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  status: AccountStatus;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  district: string;
  lat: number | null;
  lng: number | null;
  rating_avg: number;
  rating_count: number;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  min_order_amount: number;
  commission_rate: number;
  opens_at: string;
  closes_at: string;
  open_days: number[];
  is_accepting_orders: boolean;
  is_featured: boolean;
  status: RestaurantStatus;
  is_demo: boolean;
  is_open?: boolean;
  created_at: string;
  restaurant_categories?: { category_id: string }[];
}

export interface OptionChoice {
  name: string;
  price: number;
}
export interface OptionGroup {
  name: string;
  required: boolean;
  max: number;
  choices: OptionChoice[];
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  section: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number | null;
  is_available: boolean;
  is_popular: boolean;
  options: OptionGroup[];
  sort_order: number;
  is_demo: boolean;
  restaurants?: Pick<Restaurant, "id" | "slug" | "name"> | null;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  district: string;
  city: string;
  reference: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount: number | null;
  min_order_amount: number;
  starts_at: string;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  restaurant_id: string | null;
  is_active: boolean;
  is_public: boolean;
  is_demo: boolean;
}

export interface SelectedOption {
  group: string;
  choice: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  options: SelectedOption[];
  options_price: number;
  quantity: number;
  line_total: number;
  notes: string | null;
}

export interface Order {
  id: string;
  code: string;
  user_id: string;
  restaurant_id: string;
  courier_id: string | null;
  delivery_address: string;
  delivery_district: string;
  delivery_reference: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  contact_phone: string | null;
  notes: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount: number;
  total: number;
  commission_rate: number;
  commission_amount: number;
  distance_km: number | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  restaurants?: Pick<Restaurant, "id" | "slug" | "name" | "logo_url" | "lat" | "lng" | "address" | "phone" | "delivery_time_min" | "delivery_time_max"> | null;
  order_items?: OrderItem[];
  profiles?: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null;
  couriers?: Pick<Courier, "id" | "full_name" | "phone" | "vehicle_type"> | null;
  payments?: Payment[];
  /** Relación 1:1 en PostgREST: puede llegar como objeto o arreglo */
  reviews?: { id: string; rating: number }[] | { id: string; rating: number } | null;
}

export interface OrderStatusHistory {
  id: number;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  provider: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_payment_id: string | null;
  operation_number: string | null;
  payer_phone: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface Courier {
  id: string;
  full_name: string;
  phone: string;
  document_id: string | null;
  vehicle_type: "moto" | "bicicleta" | "auto" | "a_pie";
  vehicle_plate: string | null;
  status: CourierStatus;
  is_available: boolean;
  location_consent: boolean;
  last_lat: number | null;
  last_lng: number | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  restaurants?: Pick<Restaurant, "name" | "slug"> | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  order_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PlatformSettings {
  platform_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  default_commission_rate: number;
  base_delivery_fee: number;
  fee_per_km: number;
  included_km: number;
  max_delivery_km: number;
  free_delivery_threshold: number | null;
  service_fee: number;
  payment_cash_enabled: boolean;
  payment_yape_enabled: boolean;
  payment_plin_enabled: boolean;
  payment_card_enabled: boolean;
  yape_phone: string | null;
  plin_phone: string | null;
  wallet_holder_name: string | null;
  support_email: string | null;
  support_phone: string | null;
}

export interface OrderQuote {
  restaurant_id: string;
  lines: {
    product_id: string;
    product_name: string;
    unit_price: number;
    options: SelectedOption[];
    options_price: number;
    quantity: number;
    line_total: number;
  }[];
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount: number;
  total: number;
  distance_km: number | null;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_type: DiscountType | null;
}

/** Resultado estándar de las Server Actions */
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export function hasReview(order: Pick<Order, "reviews">) {
  const r = order.reviews;
  return Array.isArray(r) ? r.length > 0 : Boolean(r);
}
