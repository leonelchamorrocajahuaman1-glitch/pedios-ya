import { z } from "zod";
import { phoneSchema } from "./auth";

export const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Ingresa tu nombre completo").max(120),
  phone: phoneSchema.or(z.literal("")).transform((v) => v || null),
});

const coord = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Ponle un nombre (Casa, Trabajo…)").max(40),
  street: z.string().trim().min(5, "Ingresa la dirección completa").max(200),
  district: z.string().trim().min(2, "Ingresa el distrito").max(80),
  city: z.string().trim().min(2).max(80).default("Lima"),
  reference: z.string().trim().max(250).optional().transform((v) => v || null),
  lat: coord(-90, 90),
  lng: coord(-180, 180),
  is_default: z.union([z.literal("on"), z.literal("true"), z.literal("")]).optional().transform((v) => v === "on" || v === "true"),
});

export const reviewSchema = z.object({
  order_id: z.uuid(),
  rating: z.coerce.number().int().min(1, "Elige de 1 a 5 estrellas").max(5),
  comment: z.string().trim().max(500).optional(),
});

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del negocio").max(100),
  description: z.string().trim().max(600).default(""),
  address: z.string().trim().min(5, "Ingresa la dirección").max(200),
  district: z.string().trim().min(2, "Ingresa el distrito").max(80),
  phone: phoneSchema,
  email: z.email("Correo inválido"),
  category_ids: z.array(z.uuid()).max(5).default([]),
});
