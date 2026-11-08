import { Beef, CakeSlice, ChefHat, CupSoda, Drumstick, Fish, Pill, Pizza, ShoppingBasket, Utensils, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  beef: Beef,
  pizza: Pizza,
  drumstick: Drumstick,
  "chef-hat": ChefHat,
  fish: Fish,
  "cake-slice": CakeSlice,
  "cup-soda": CupSoda,
  "shopping-basket": ShoppingBasket,
  pill: Pill,
  utensils: Utensils,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Utensils;
  return <Icon className={className} aria-hidden />;
}
