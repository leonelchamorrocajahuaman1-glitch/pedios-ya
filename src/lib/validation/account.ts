import { z } from "zod";
import { phoneSchema } from "./auth";

export const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Ingresa tu nombre completo").max(120),
  phone: phoneSchema.or(z.literal("")).transform((v) => v || null),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Ponle un nombre (Casa, Trabajo…)").max(40),
  street: z.string().trim().min(5, "Ingresa la dirección completa").max(200),
  district: z.string().trim().min(2, "Ingresa el distrito").max(80),
  city: z.string().trim().min(2).max(80).default("Lima"),
  reference: z.string().trim().max(250).optional().transform((v) => v || null),
  is_default: z.union([z.literal("on"), z.literal("true"), z.literal("")]).optional().transform((v) => v === "on" || v === "true"),
});
