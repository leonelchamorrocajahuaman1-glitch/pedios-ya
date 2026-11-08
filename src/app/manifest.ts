import type { MetadataRoute } from "next";

/** Manifiesto PWA: la tienda se puede instalar en Android, iPhone y escritorio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MULTIPRODUCTOS HUAYTALLA",
    short_name: "Huaytalla",
    description: "Todo lo que necesitas, en un solo lugar. Minimarket online con delivery.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7f3",
    theme_color: "#16a34a",
    lang: "es-PE",
    categories: ["shopping", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ofertas", url: "/productos?ofertas=1" },
      { name: "Mis pedidos", url: "/cuenta/pedidos" },
    ],
  };
}
