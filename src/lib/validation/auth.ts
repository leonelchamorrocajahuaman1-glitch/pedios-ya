import { z } from "zod";

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga")
  .regex(/[A-Za-z]/, "Incluye al menos una letra")
  .regex(/[0-9]/, "Incluye al menos un número");

/** Normaliza (espacios, mayúsculas) ANTES de validar el formato. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Ingresa un correo válido"));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{6,20}$/, "Ingresa un teléfono válido (ej. 987 654 321)");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(3, "Ingresa tu nombre completo").max(120),
    email: emailSchema,
    phone: phoneSchema,
    password,
    confirm: z.string(),
    terms: z.literal("on", { error: "Debes aceptar los términos y la política de privacidad" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export const recoverSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });
