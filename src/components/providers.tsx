"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CartProvider } from "@/hooks/use-cart";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <CartProvider>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "!rounded-2xl" }} />
      </CartProvider>
    </ThemeProvider>
  );
}
