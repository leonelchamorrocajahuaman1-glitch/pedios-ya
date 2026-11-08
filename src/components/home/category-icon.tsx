import {
  Bath, Candy, Coffee, Cookie, Croissant, CupSoda, Droplet, GlassWater, Lamp, Milk, Package, Popcorn,
  ShoppingBasket, SprayCan, Tag, Wheat, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
  "glass-water": GlassWater,
  popcorn: Popcorn,
  cookie: Cookie,
  candy: Candy,
  "shopping-basket": ShoppingBasket,
  wheat: Wheat,
  droplet: Droplet,
  milk: Milk,
  croissant: Croissant,
  package: Package,
  "spray-can": SprayCan,
  bath: Bath,
  lamp: Lamp,
  tag: Tag,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ShoppingBasket;
  return <Icon className={className} aria-hidden />;
}
