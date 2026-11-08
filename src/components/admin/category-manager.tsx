"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon, CATEGORY_ICON_OPTIONS } from "@/components/home/category-icon";
import { ImageUpload } from "./image-upload";
import { useRun } from "./use-run";
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction, toggleCategoryAction } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types";

type Editing = { cat?: Category; parentId?: string | null } | null;

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const { pending, run } = useRun();
  const [editing, setEditing] = useState<Editing>(null);
  const [active, setActive] = useState(true);
  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const open = (e: Editing) => {
    setActive(e?.cat?.is_active ?? true);
    setEditing(e);
  };
  const c = editing?.cat;

  const Row = ({ cat, sub, first, last }: { cat: Category; sub?: boolean; first: boolean; last: boolean }) => (
    <div className={sub ? "flex items-center gap-3 border-t border-border py-3 pl-4 sm:pl-10" : "flex items-center gap-3 py-3"}>
      {sub && <CornerDownRight className="h-4 w-4 shrink-0 text-muted" />}
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand/12 text-brand">
        {cat.image_url ? <SmartImage src={cat.image_url} alt="" fill sizes="48px" className="object-cover" /> : <CategoryIcon name={cat.icon} className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">{cat.name} {!cat.is_active && <Badge>Inactiva</Badge>}</p>
        <p className="truncate text-xs text-muted">/{cat.slug} · {counts[cat.id] ?? 0} producto(s){!sub && ` · ${childrenOf(cat.id).length} subcategoría(s)`}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Switch checked={cat.is_active} disabled={pending} onChange={(v) => run(() => toggleCategoryAction(cat.id, v))} />
        <Button size="icon" variant="ghost" disabled={first || pending} onClick={() => run(() => moveCategoryAction(cat.id, "up"))} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" disabled={last || pending} onClick={() => run(() => moveCategoryAction(cat.id, "down"))} aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
        {!sub && <Button size="icon" variant="ghost" onClick={() => open({ parentId: cat.id })} aria-label="Agregar subcategoría"><Plus className="h-4 w-4" /></Button>}
        <Button size="icon" variant="ghost" onClick={() => open({ cat })} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
        <ConfirmButton
          size="icon" variant="ghost" aria-label="Eliminar"
          title={`¿Eliminar «${cat.name}»?`}
          description={sub ? "Solo se puede eliminar si no tiene productos." : "Solo se puede eliminar si no tiene productos ni subcategorías."}
          confirmLabel="Eliminar"
          onConfirm={() => run(() => deleteCategoryAction(cat.id))}
        >
          <Trash2 className="h-4 w-4 text-danger" />
        </ConfirmButton>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open({ parentId: null })}><Plus className="h-4 w-4" /> Nueva categoría</Button></div>
      {parents.length === 0 ? <EmptyState title="Aún no hay categorías" /> : (
        <div className="space-y-3">
          {parents.map((cat, i) => {
            const kids = childrenOf(cat.id);
            return (
              <div key={cat.id} className="rounded-3xl border border-border bg-surface px-4">
                <Row cat={cat} first={i === 0} last={i === parents.length - 1} />
                {kids.map((k, j) => <Row key={k.id} cat={k} sub first={j === 0} last={j === kids.length - 1} />)}
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={c ? "Editar categoría" : editing?.parentId ? "Nueva subcategoría" : "Nueva categoría"}>
        <form
          key={c?.id ?? `new-${editing?.parentId ?? ""}`}
          className="space-y-4 p-6"
          action={(fd) => {
            if (!fd.get("slug")) fd.set("slug", slugify(String(fd.get("name"))));
            run(() => saveCategoryAction(fd), () => setEditing(null));
          }}
        >
          {c && <input type="hidden" name="id" value={c.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="cname"><Input id="cname" name="name" defaultValue={c?.name} required maxLength={60} /></Field>
            <Field label="Slug (URL)" htmlFor="cslug" hint="Vacío = se genera del nombre"><Input id="cslug" name="slug" defaultValue={c?.slug} maxLength={60} /></Field>
            <Field label="Pertenece a" htmlFor="cparent">
              <Select id="cparent" name="parent_id" defaultValue={c ? c.parent_id ?? "" : editing?.parentId ?? ""}>
                <option value="">— Categoría principal —</option>
                {parents.filter((p) => p.id !== c?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Ícono" htmlFor="cicon">
              <Select id="cicon" name="icon" defaultValue={c?.icon ?? "shopping-basket"}>{CATEGORY_ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}</Select>
            </Field>
            <Field label="Orden" htmlFor="corder"><Input id="corder" name="sort_order" type="number" min={0} defaultValue={c?.sort_order ?? categories.length + 1} /></Field>
          </div>
          <Field label="Descripción" htmlFor="cdesc"><Textarea id="cdesc" name="description" maxLength={300} defaultValue={c?.description ?? ""} /></Field>
          <ImageUpload name="image_url" folder="categories" defaultValue={c?.image_url} label="Imagen (opcional)" />
          <Switch name="is_active" checked={active} onChange={setActive} label="Visible para los clientes" />
          <Button type="submit" loading={pending}>Guardar</Button>
        </form>
      </Dialog>
    </>
  );
}
