import { describe, expect, it } from "vitest";
import { toOrderItems } from "@/hooks/use-cart";
import { nextStatus } from "@/lib/constants";
import { formatPEN } from "@/lib/format";
import { slugify } from "@/lib/utils";
import { sanitizeQuery } from "@/lib/services/store";

describe("utilidades", () => {
  it("convierte el carrito en ítems para el pedido (solo id y cantidad: el precio lo pone la BD)", () => {
    const items = toOrderItems([{ product_id: "p1", slug: "a", name: "A", image_url: null, price: 1, stock: 5, quantity: 2 }]);
    expect(items).toEqual([{ product_id: "p1", quantity: 2 }]);
  });
  it("sigue el flujo de estados según la modalidad", () => {
    expect(nextStatus("received", "delivery")).toBe("accepted");
    expect(nextStatus("ready", "delivery")).toBe("on_the_way");
    expect(nextStatus("ready", "pickup")).toBe("delivered");
    expect(nextStatus("delivered", "delivery")).toBeNull();
    expect(nextStatus("cancelled", "pickup")).toBeNull();
  });
  it("formatea soles", () => {
    expect(formatPEN(12.9).replace(/\s/g, " ")).toMatch(/S\/\s?12\.90/);
  });
  it("genera slugs y limpia búsquedas", () => {
    expect(slugify("Galletas Ñandú & Cía")).toBe("galletas-nandu-cia");
    expect(sanitizeQuery("arroz%,id.eq.1)")).toBe("arroz id eq 1");
  });
});

import { toUserMessage } from "@/lib/errors";
describe("mensajes de error de Supabase en español", () => {
  it("traduce correos inválidos y fallos de envío", () => {
    expect(toUserMessage({ message: 'Email address "x@y.test" is invalid' })).toMatch(/no es válido/);
    expect(toUserMessage({ message: "Email address not authorized" })).toMatch(/correo de confirmación/);
    expect(toUserMessage({ code: "42501", message: "x" })).toMatch(/permisos/);
  });
});
