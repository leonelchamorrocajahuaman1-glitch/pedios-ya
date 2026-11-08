"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "./button";
import { Dialog } from "./dialog";

/** Botón que pide confirmación antes de ejecutar una acción destructiva o importante. */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  children,
  ...buttonProps
}: Omit<ButtonProps, "onClick"> & {
  onConfirm: () => Promise<unknown> | unknown;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => !loading && setOpen(false)} title={title} size="sm">
        <div className="space-y-6 p-6">
          {description && <div className="text-sm text-muted">{description}</div>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant={buttonProps.variant === "danger" ? "danger" : "primary"}
              loading={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
