"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/format";
import type { AppNotification } from "@/types";
import { cn } from "@/lib/utils";

/** Campana con notificaciones en tiempo real (Supabase Realtime + RLS). */
export function NotificationsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setItems((data ?? []) as AppNotification[]));
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => [n, ...prev].slice(0, 15));
          toast(n.title, { description: n.body });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    const supabase = getSupabaseBrowserClient();
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: now }).in("id", ids);
    if (!error) setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2"
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-semibold">Notificaciones</p>
              <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-semibold text-brand disabled:opacity-40" disabled={!unread}>
                <CheckCheck className="h-4 w-4" /> Marcar leídas
              </button>
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Aún no tienes notificaciones.</li>}
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.order_id ? `/pedidos/${n.order_id}` : "/cuenta"}
                    onClick={() => setOpen(false)}
                    className={cn("flex gap-3 px-4 py-3 transition hover:bg-surface-2", !n.read_at && "bg-brand/5")}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{n.title}</span>
                      <span className="block truncate text-xs text-muted">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{formatRelative(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
