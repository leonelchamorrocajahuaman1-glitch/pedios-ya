import { describe, expect, it } from "vitest";
import { distanceKm } from "@/lib/geo";
import { itemKey } from "@/hooks/use-cart";
import { formatPEN } from "@/lib/format";
import { slugify } from "@/lib/utils";
import { sanitizeQuery } from "@/lib/services/catalog";

describe("utilidades", () => {
  it("calcula distancias (Miraflores → Barranco ≈ 2.8 km)", () => {
    const d = distanceKm({ lat: -12.1211, lng: -77.0297 }, { lat: -12.1463, lng: -77.0204 });
    expect(d).toBeGreaterThan(2.5);
    expect(d).toBeLessThan(3.2);
  });
  it("agrupa ítems del carrito por producto + opciones + notas", () => {
    const a = itemKey("p1", [{ group: "Tamaño", choice: "Grande", price: 3 }, { group: "Extra", choice: "Queso", price: 2 }]);
    const b = itemKey("p1", [{ group: "Extra", choice: "Queso", price: 2 }, { group: "Tamaño", choice: "Grande", price: 3 }]);
    expect(a).toBe(b);
    expect(itemKey("p1", [], "sin cebolla")).not.toBe(itemKey("p1", []));
  });
  it("formatea soles", () => {
    expect(formatPEN(12.9).replace(/\s/g, " ")).toMatch(/S\/\s?12\.90/);
  });
  it("genera slugs y limpia búsquedas", () => {
    expect(slugify("Pollería Ñandú & Cía")).toBe("polleria-nandu-cia");
    expect(sanitizeQuery("pizza%,id.eq.1)")).toBe("pizza id eq 1");
  });
});
