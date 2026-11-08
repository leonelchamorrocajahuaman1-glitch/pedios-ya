import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog, type CatalogParams } from "@/components/store/catalog";
import { CategoryIcon } from "@/components/home/category-icon";
import { SmartImage } from "@/components/ui/smart-image";
import { getCategoryTree } from "@/lib/services/store";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<CatalogParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategoryTree()).find((c) => c.slug === slug);
  return { title: category ? category.name : "Categoría" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp, categories] = await Promise.all([params, searchParams, getCategoryTree()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-strong to-brand p-6 text-white sm:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 sm:block">
          <SmartImage src={category.image_url} alt="" fill sizes="50vw" className="object-cover opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]" />
        </div>
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20"><CategoryIcon name={category.icon} className="h-7 w-7" /></span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{category.name}</h1>
            {category.description && <p className="text-sm text-white/85">{category.description}</p>}
          </div>
        </div>
      </div>
      <Catalog params={sp} categories={categories} category={category} basePath={`/categoria/${slug}`} />
    </div>
  );
}
