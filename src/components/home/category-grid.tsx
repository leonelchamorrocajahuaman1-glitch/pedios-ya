import Link from "next/link";
import type { Category } from "@/types";
import { SmartImage } from "@/components/ui/smart-image";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/utils";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 md:grid-cols-5 lg:grid-cols-8">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/categoria/${c.slug}`}
          className="group flex w-28 shrink-0 flex-col items-center gap-2 text-center sm:w-auto"
        >
          <span className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-brand group-hover:shadow-card">
            <SmartImage src={c.image_url} alt="" fill sizes="140px" className="object-cover opacity-90 transition duration-500 group-hover:scale-110" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-xl bg-white/95 text-brand shadow">
              <CategoryIcon name={c.icon} className="h-4 w-4" />
            </span>
          </span>
          <span className="text-xs font-semibold leading-tight sm:text-sm">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}

export function CategoryChips({ categories, activeSlug, basePath = "/categoria" }: { categories: Category[]; activeSlug?: string; basePath?: string }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href="/productos" className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition", !activeSlug ? "border-fg bg-fg text-bg" : "border-border bg-surface hover:border-brand")}>
        Todo
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`${basePath}/${c.slug}`}
          className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition", c.slug === activeSlug ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface hover:border-brand")}
        >
          <CategoryIcon name={c.icon} className="h-4 w-4" /> {c.name}
        </Link>
      ))}
    </div>
  );
}
