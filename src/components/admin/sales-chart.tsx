"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeriesPoint {
  label: string;
  sales: number;
  orders: number;
}

type Range = "daily" | "weekly" | "monthly";
type Metric = "sales" | "orders";
const RANGES: { id: Range; label: string }[] = [
  { id: "daily", label: "Día" },
  { id: "weekly", label: "Semana" },
  { id: "monthly", label: "Mes" },
];

/**
 * Ventas o pedidos por periodo. Una sola serie y un solo eje (nunca doble eje):
 * el usuario alterna la métrica. Incluye tooltip y vista de tabla accesible.
 */
export function SalesChart({ data }: { data: Record<Range, SeriesPoint[]> }) {
  const [range, setRange] = useState<Range>("daily");
  const [metric, setMetric] = useState<Metric>("sales");
  const [table, setTable] = useState(false);
  const points = data[range];
  const total = points.reduce((a, p) => a + Number(p[metric]), 0);
  const fmt = (v: number) => (metric === "sales" ? formatPEN(v) : `${v} pedidos`);

  const seg = (active: boolean) => cn("h-8 rounded-full px-3 text-xs font-semibold transition", active ? "bg-fg text-bg" : "text-muted hover:text-fg");

  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{metric === "sales" ? "Ventas" : "Pedidos"} por {RANGES.find((r) => r.id === range)!.label.toLowerCase()}</h2>
          <p className="text-sm text-muted">Total del periodo: <span className="font-semibold text-fg">{fmt(total)}</span> · excluye cancelados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full bg-surface-2 p-1">
            <button className={seg(metric === "sales")} onClick={() => setMetric("sales")}>Ventas</button>
            <button className={seg(metric === "orders")} onClick={() => setMetric("orders")}>Pedidos</button>
          </div>
          <div className="flex rounded-full bg-surface-2 p-1">
            {RANGES.map((r) => <button key={r.id} className={seg(range === r.id)} onClick={() => setRange(r.id)}>{r.label}</button>)}
          </div>
          <button className="h-10 rounded-full px-3 text-xs font-semibold text-muted underline" onClick={() => setTable((t) => !t)}>{table ? "Ver gráfico" : "Ver tabla"}</button>
        </div>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-2">Periodo</th><th className="py-2 text-right">Ventas</th><th className="py-2 text-right">Pedidos</th></tr></thead>
            <tbody>{points.map((p) => <tr key={p.label} className="border-t border-border"><td className="py-1.5">{p.label}</td><td className="py-1.5 text-right">{formatPEN(p.sales)}</td><td className="py-1.5 text-right">{p.orders}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="h-72" role="img" aria-label={`Gráfico de ${metric === "sales" ? "ventas" : "pedidos"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={metric === "sales" ? 64 : 32} allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v) => (metric === "sales" ? `S/${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : v}` : String(v))} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, color: "var(--fg)", fontSize: 12 }}
                formatter={(v) => [fmt(Number(v)), metric === "sales" ? "Ventas" : "Pedidos"]}
              />
              <Bar dataKey={metric} fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
