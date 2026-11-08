import type { z } from "zod";

/** Primer mensaje de error de Zod, listo para mostrar. */
export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Datos inválidos";
}

/** Errores por campo para formularios. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
