"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

/** Imagen optimizada con respaldo visual si la URL falla o no existe. */
export function SmartImage({ src, alt, className, fallbackClassName, ...props }: Omit<ImageProps, "src"> & {
  src?: string | null;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          "grid h-full w-full place-items-center bg-gradient-to-br from-brand/25 via-accent/20 to-lime/20 text-fg/40",
          fallbackClassName,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ShoppingBasket className="h-1/4 max-h-10 w-1/4 max-w-10" />
      </div>
    );
  }
  return <Image src={src} alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
