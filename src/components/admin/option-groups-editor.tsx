"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OptionGroup } from "@/types";

/** Editor visual de grupos de opciones (tamaño, extras, bebida…) que se guarda como JSON. */
export function OptionGroupsEditor({ name, initial }: { name: string; initial: OptionGroup[] }) {
  const [groups, setGroups] = useState<OptionGroup[]>(initial);
  const update = (i: number, patch: Partial<OptionGroup>) => setGroups((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(groups)} />
      {groups.map((g, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={g.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Nombre del grupo (ej. Tamaño)" className="h-10 flex-1" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={g.required} onChange={(e) => update(i, { required: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" /> Obligatorio</label>
            <label className="flex items-center gap-2 text-sm">Máx. <input type="number" min={1} max={10} value={g.max} onChange={(e) => update(i, { max: Math.max(1, Number(e.target.value)) })} className="h-10 w-16 rounded-xl border border-border bg-surface px-2" /></label>
            <Button type="button" size="icon" variant="ghost" onClick={() => setGroups((x) => x.filter((_, j) => j !== i))} aria-label="Eliminar grupo"><Trash2 className="h-4 w-4 text-danger" /></Button>
          </div>
          {g.choices.map((c, k) => (
            <div key={k} className="flex gap-2 pl-4">
              <Input value={c.name} onChange={(e) => update(i, { choices: g.choices.map((y, m) => (m === k ? { ...y, name: e.target.value } : y)) })} placeholder="Opción" className="h-9 flex-1" />
              <Input type="number" step="0.10" min={0} value={c.price} onChange={(e) => update(i, { choices: g.choices.map((y, m) => (m === k ? { ...y, price: Number(e.target.value) } : y)) })} className="h-9 w-28" aria-label="Precio adicional" />
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => update(i, { choices: g.choices.filter((_, m) => m !== k) })} aria-label="Quitar opción"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <button type="button" className="pl-4 text-sm font-semibold text-brand" onClick={() => update(i, { choices: [...g.choices, { name: "", price: 0 }] })}>+ Agregar opción</button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setGroups((g) => [...g, { name: "", required: false, max: 1, choices: [{ name: "", price: 0 }] }])}>
        <Plus className="h-4 w-4" /> Grupo de opciones
      </Button>
    </div>
  );
}
