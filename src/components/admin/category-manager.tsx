"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon, CATEGORY_ICON_OPTIONS } from "@/components/home/category-icon";
import { ImageUpload } from "./image-upload";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types";

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [pending, start] = useTransition();
  const c = editing && editing !== "new" ? editing : undefined;
  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Nueva categoría</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/12 text-brand"><CategoryIcon name={cat.icon} className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{cat.name} {!cat.is_active && <Badge>Inactiva</Badge>}</p>
              <p className="text-xs text-muted">/{cat.slug} · {counts[cat.id] ?? 0} negocios · orden {cat.sort_order}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(cat)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
            <ConfirmButton size="icon" variant="ghost" title={`¿Eliminar ${cat.name}?`} description="Los productos quedarán sin categoría." confirmLabel="Eliminar" onConfirm={async () => {
              const res = await deleteCategoryAction(cat.id);
              if (!res.ok) toast.error(res.error); else { toast.success(res.message); router.refresh(); }
            }} aria-label="Eliminar"><Trash2 className="h-4 w-4 text-danger" /></ConfirmButton>
          </div>
        ))}
      </div>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={c ? "Editar categoría" : "Nueva categoría"}>
        <form
          key={c?.id ?? "new"}
          className="space-y-4 p-6"
          action={(fd) => start(async () => {
            if (!fd.get("slug")) fd.set("slug", slugify(String(fd.get("name"))));
            const res = await saveCategoryAction(fd);
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            setEditing(null);
            router.refresh();
          })}
        >
          {c && <input type="hidden" name="id" value={c.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="cname"><Input id="cname" name="name" defaultValue={c?.name} required /></Field>
            <Field label="Slug" htmlFor="cslug"><Input id="cslug" name="slug" defaultValue={c?.slug} /></Field>
            <Field label="Ícono" htmlFor="cicon">
              <Select id="cicon" name="icon" defaultValue={c?.icon ?? "utensils"}>{CATEGORY_ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}</Select>
            </Field>
            <Field label="Orden" htmlFor="corder"><Input id="corder" name="sort_order" type="number" min={0} defaultValue={c?.sort_order ?? 0} /></Field>
          </div>
          <ImageUpload name="image_url" folder="categories" defaultValue={c?.image_url} />
          <Checkbox name="is_active" defaultChecked={c?.is_active ?? true} label="Visible para clientes" />
          <Button type="submit" loading={pending}>Guardar</Button>
        </form>
      </Dialog>
    </>
  );
}
