import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CustomerEditForm, CustomerStatusButton, TestAccountToggle } from "@/components/admin/customer-actions";
import { StatCard } from "@/components/admin/stat-card";
import { TableWrap, Td, Th, Tr } from "@/components/admin/table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, formatPEN } from "@/lib/format";
import type { Address, Order, Profile } from "@/types";

export const metadata: Metadata = { title: "Cliente" };

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: orders }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, role, status, created_at, avatar_url, is_test").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, code, is_test, status, total, payment_method, fulfillment, created_at").eq("user_id", id).eq("catalog", "store").order("created_at", { ascending: false }).limit(100),
    supabase.from("addresses").select("*").eq("user_id", id),
  ]);
  if (!profile) notFound();
  const p = profile as Profile;
  const list = (orders ?? []) as unknown as Order[];
  const spent = list.filter((o) => o.status === "delivered" && !o.is_test).reduce((a, o) => a + Number(o.total), 0);
  return (
    <div className="space-y-6">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{p.full_name || "Sin nombre"}</h1>
        <Badge tone={p.status === "active" ? "success" : "danger"}>{p.status === "active" ? "Activo" : "Suspendido"}</Badge>
        {p.is_test && <Badge tone="warning">Cuenta de prueba</Badge>}
        <CustomerStatusButton profile={p} />
        <TestAccountToggle profile={p} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pedidos" value={String(list.length)} />
        <StatCard label="Total comprado" value={formatPEN(spent)} hint="Pedidos entregados" />
        <StatCard label="Cliente desde" value={formatDate(p.created_at)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Datos</CardTitle></CardHeader><CardBody><p className="mb-3 text-sm text-muted">{p.email}</p><CustomerEditForm profile={p} /></CardBody></Card>
          <Card><CardHeader><CardTitle>Direcciones</CardTitle></CardHeader><CardBody className="space-y-2 text-sm">
            {(addresses as Address[] | null)?.length ? (addresses as Address[]).map((a) => <p key={a.id}><strong>{a.label}:</strong> {a.street}{a.district && `, ${a.district}`}{a.reference && <span className="block text-xs text-muted">Ref.: {a.reference}</span>}</p>) : <p className="text-muted">Sin direcciones.</p>}
          </CardBody></Card>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Pedidos</h2>
          <TableWrap>
            <thead><tr><Th>Pedido</Th><Th>Entrega</Th><Th>Estado</Th><Th>Método</Th><Th className="text-right">Total</Th></tr></thead>
            <tbody>
              {list.map((o) => (
                <Tr key={o.id}>
                  <Td><Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold text-brand">{o.code}</Link>{o.is_test && <Badge tone="warning" className="ml-2">PRUEBA</Badge>}<p className="text-xs text-muted">{formatDateTime(o.created_at)}</p></Td>
                  <Td>{o.fulfillment === "pickup" ? "Recojo" : "Delivery"}</Td>
                  <Td><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></Td>
                  <Td>{PAYMENT_METHOD_LABEL[o.payment_method]}</Td>
                  <Td className="text-right font-semibold">{formatPEN(o.total)}</Td>
                </Tr>
              ))}
              {list.length === 0 && <Tr><Td colSpan={5} className="py-8 text-center text-muted">Sin pedidos.</Td></Tr>}
            </tbody>
          </TableWrap>
        </div>
      </div>
    </div>
  );
}
