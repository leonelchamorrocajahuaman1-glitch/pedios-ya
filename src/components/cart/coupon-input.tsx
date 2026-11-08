"use client";

import { useState } from "react";
import { Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CouponInput({ value, error, onApply }: { value: string | null; error?: string | null; onApply: (code: string | null) => void }) {
  const [code, setCode] = useState("");
  if (value) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-brand bg-brand/5 px-4 py-3">
          <span className="flex items-center gap-2 font-mono text-sm font-bold text-brand"><Ticket className="h-4 w-4" /> {value}</span>
          <button onClick={() => onApply(null)} className="text-muted hover:text-fg" aria-label="Quitar cupón"><X className="h-4 w-4" /></button>
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (/^[A-Z0-9_-]{3,30}$/.test(c)) onApply(c);
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Código de cupón"
        className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 font-mono text-sm uppercase outline-none focus:border-brand"
        maxLength={30}
        aria-label="Código de cupón"
      />
      <Button type="submit" variant="secondary" disabled={code.trim().length < 3}>Aplicar</Button>
    </form>
  );
}
