import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import "./globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Space_Grotesk({ variable: "--font-display-face", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "MULTIPRODUCTOS HUAYTALLA · Minimarket online", template: "%s · Multiproductos Huaytalla" },
  description:
    "Todo lo que necesitas, en un solo lugar. Abarrotes, bebidas, snacks, lácteos, limpieza y más con delivery o recojo en tienda. Paga con efectivo, Yape o Plin.",
  applicationName: "Multiproductos Huaytalla",
  appleWebApp: { capable: true, title: "Huaytalla", statusBarStyle: "default" },
  openGraph: { type: "website", locale: "es_PE", siteName: "MULTIPRODUCTOS HUAYTALLA" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#06100a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" suppressHydrationWarning className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
