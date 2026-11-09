export type AppRole = "admin" | "customer";
export type AccountStatus = "active" | "suspended";
export type OrderStatus = "received" | "accepted" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled";
export type PaymentMethod = "cash" | "yape" | "plin" | "card";
export type PaymentStatus = "pending" | "pending_verification" | "approved" | "rejected" | "refunded" | "cancelled";
export type Fulfillment = "delivery" | "pickup";
export type DiscountType = "percentage" | "fixed" | "free_delivery";
export type MovementType = "in" | "out" | "adjustment" | "sale" | "sale_cancel";
export type ProductUnit = "unidad" | "kg" | "g" | "l" | "ml" | "paquete" | "caja" | "docena" | "bolsa" | "lata" | "botella" | "six pack";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  status: AccountStatus;
  /** Cuenta de prueba (solo la marca un admin) */
  is_test?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image_url: string | null;
  description: string;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
  children?: Category[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  image_credit: string | null;
  price: number;
  compare_at_price: number | null;
  /** Solo en el panel: viene de product_costs (privada) */
  cost_price?: number | null;
  final_price: number;
  discount_percent: number;
  stock: number;
  min_stock: number;
  weight: number | null;
  unit: ProductUnit;
  is_available: boolean;
  is_featured: boolean;
  is_demo: boolean;
  sort_order: number;
  created_at: string;
  categories?: Pick<Category, "id" | "slug" | "name"> | null;
  product_images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string;
  sort_order: number;
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
  is_active: boolean;
  is_public: boolean;
  is_demo: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  scope: "product" | "category" | "order";
  product_id: string | null;
  category_id: string | null;
  min_order_amount: number;
  max_discount: number | null;
  starts_at: string;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  show_on_home: boolean;
  banner_image_url: string | null;
  is_demo: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  sku: string | null;
  unit_price: number;
  original_price: number | null;
  unit_cost: number | null;
  quantity: number;
  line_total: number;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  provider: string;
  amount: number;
  status: PaymentStatus;
  operation_number: string | null;
  payer_phone: string | null;
  proof_path: string | null;
  review_note: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  code: string;
  /** Pedido de una cuenta de prueba: excluido de reportes */
  is_test?: boolean;
  user_id: string;
  fulfillment: Fulfillment;
  customer_name: string | null;
  contact_phone: string | null;
  delivery_address: string;
  delivery_district: string;
  delivery_reference: string | null;
  notes: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  promotion_discount: number;
  coupon_discount: number;
  total: number;
  delivery_person_name: string | null;
  delivery_person_phone: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  order_items?: OrderItem[];
  payments?: Payment[];
  profiles?: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null;
}

export interface OrderStatusHistory {
  id: number;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: number;
  product_id: string;
  type: MovementType;
  quantity: number;
  stock_before: number | null;
  stock_after: number | null;
  reason: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
  products?: Pick<Product, "id" | "name" | "sku"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
}

export interface OpeningHour {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export interface StoreSettings {
  business_name: string;
  slogan: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string;
  district: string;
  city: string;
  opening_hours: OpeningHour[];
  accepting_orders: boolean;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  min_order_amount: number;
  delivery_eta: string;
  welcome_message: string;
  checkout_message: string;
  order_confirmation_message: string;
  support_message: string;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  low_stock_default: number;
}

export interface PaymentMethodConfig {
  code: PaymentMethod;
  name: string;
  is_enabled: boolean;
  account_holder: string | null;
  phone_number: string | null;
  qr_image_url: string | null;
  instructions: string;
  requires_proof: boolean;
  sort_order: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  districts: string[];
  fee: number;
  min_order_amount: number | null;
  eta: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface QuoteLine {
  product_id: string;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  original_price: number;
  quantity: number;
  line_total: number;
  stock: number;
}

export interface CartQuote {
  lines: QuoteLine[];
  items_count: number;
  subtotal: number;
  delivery_fee: number;
  promotion_id: string | null;
  promotion_name: string | null;
  promotion_discount: number;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount: number;
  discount: number;
  total: number;
  min_order_amount: number;
  fulfillment: Fulfillment;
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

/** Resultado estándar de las Server Actions */
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
