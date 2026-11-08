import Link from "next/link";
import type { Category } from "@/types";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/utils";

export function CategoryRail({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.id}
            href={`/categoria/${c.slug}`}
            className={cn(
              "group flex w-24 shrink-0 flex-col items-center gap-2 rounded-3xl border p-3 text-center transition duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-card sm:w-28",
              active ? "border-brand bg-brand/10" : "border-border bg-surface",
            )}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-accent/15 text-brand transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <CategoryIcon name={c.icon} className="h-7 w-7" />
            </span>
            <span className="text-xs font-semibold leading-tight">{c.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
