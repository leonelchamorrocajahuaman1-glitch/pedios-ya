"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRestaurantStatusAction } from "@/lib/actions/admin";
import type { RestaurantStatus } from "@/types";

export function RestaurantStatusActions({ id, status }: { id: string; status: RestaurantStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (s: RestaurantStatus) =>
    start(async () => {
      const res = await setRestaurantStatusAction(id, s);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message);
        router.refresh();
      }
    });
  return (
    <div className="flex justify-end gap-1.5">
      {status === "pending" && (
        <>
          <Button size="sm" variant="success" loading={pending} onClick={() => set("approved")}>Aprobar</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => set("rejected")}>Rechazar</Button>
        </>
      )}
      {status === "approved" && <Button size="sm" variant="outline" loading={pending} onClick={() => set("suspended")}>Suspender</Button>}
      {(status === "suspended" || status === "rejected") && <Button size="sm" variant="outline" loading={pending} onClick={() => set("approved")}>Reactivar</Button>}
    </div>
  );
}
