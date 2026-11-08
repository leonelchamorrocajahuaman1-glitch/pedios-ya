"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPEN } from "@/lib/format";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, color: "var(--fg)", fontSize: 12 };
const tick = { fill: "var(--muted)", fontSize: 11 };
const money = (v: number) => `S/${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`;

export interface RankItem { name: string; qty: number; revenue: number }

/** Ranking horizontal (una sola serie). Útil para productos y categorías más vendidos. */
export function RankingChart({ data, metric = "qty", title, empty = "Aún no hay ventas entregadas." }: { data: RankItem[]; metric?: "qty" | "revenue"; title: string; empty?: string }) {
  const rows = data.map((d) => ({ ...d, qty: Number(d.qty), revenue: Number(d.revenue), short: d.name.length > 24 ? `${d.name.slice(0, 23)}…` : d.name }));
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted">{metric === "qty" ? "Unidades vendidas" : "Ingresos (S/)"} · pedidos entregados</p>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{empty}</p>
      ) : (
        <div style={{ height: Math.max(160, rows.length * 38) }} role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
              <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={tick} allowDecimals={false} tickFormatter={(v) => (metric === "revenue" ? money(Number(v)) : String(v))} />
              <YAxis type="category" dataKey="short" tickLine={false} axisLine={false} width={150} tick={{ ...tick, fill: "var(--fg)" }} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={tooltipStyle}
                labelFormatter={(_, p) => (p?.[0]?.payload as RankItem | undefined)?.name ?? ""}
                formatter={(v) => [metric === "qty" ? `${v} u.` : formatPEN(Number(v)), metric === "qty" ? "Unidades" : "Ingresos"]}
              />
              <Bar dataKey={metric} fill={metric === "qty" ? "var(--brand)" : "var(--accent)"} radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export interface MonthPoint { label: string; sales: number; profit: number }

/** Evolución de ingresos (ventas de productos) y ganancia bruta por mes, un solo eje en soles. */
export function RevenueChart({ data }: { data: MonthPoint[] }) {
  const rows = data.map((d) => ({ ...d, sales: Number(d.sales), profit: Number(d.profit) }));
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">Evolución de ingresos</h2>
      <p className="mb-2 text-sm text-muted">Últimos 12 meses · ventas de productos y ganancia bruta estimada (venta − costo)</p>
      <div className="mb-3 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-brand" /> Ventas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent" /> Ganancia bruta</span>
      </div>
      <div className="h-64" role="img" aria-label="Evolución mensual de ingresos">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} minTickGap={12} />
            <YAxis tickLine={false} axisLine={false} width={60} tick={tick} tickFormatter={(v) => money(Number(v))} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [formatPEN(Number(v)), n === "sales" ? "Ventas" : "Ganancia bruta"]} />
            <Line type="monotone" dataKey="sales" stroke="var(--brand)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="profit" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
