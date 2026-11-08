"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name, badge }: { images: string[]; name: string; badge?: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-border bg-surface-2">
        <AnimatePresence mode="wait">
          <motion.div key={images[i]} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0">
            <SmartImage src={images[i]} alt={name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
        {badge && <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white shadow">{badge}</span>}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, idx) => (
            <button key={src + idx} onClick={() => setI(idx)} className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition", idx === i ? "border-brand" : "border-transparent opacity-70 hover:opacity-100")} aria-label={`Ver imagen ${idx + 1}`}>
              <SmartImage src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
