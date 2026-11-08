"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SmartImage } from "@/components/ui/smart-image";
import { Input } from "@/components/ui/input";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Sube imágenes al bucket "images" de Supabase Storage (solo admins por política RLS)
 * y guarda la URL pública en un campo oculto del formulario. También acepta URL manual.
 */
export function ImageUpload({ name, defaultValue, folder, label = "Imagen", onChange }: { name: string; defaultValue?: string | null; folder: string; label?: string; onChange?: (url: string) => void }) {
  const [url, setUrlState] = useState(defaultValue ?? "");
  const setUrl = (v: string) => {
    setUrlState(v);
    onChange?.(v);
  };
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    if (!TYPES.includes(file.type)) return void toast.error("Formato no permitido (JPG, PNG, WebP o AVIF)");
    if (file.size > MAX) return void toast.error("La imagen supera 5 MB");
    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { cacheControl: "31536000", contentType: file.type });
    setUploading(false);
    if (error) return void toast.error(`No se pudo subir: ${error.message}`);
    setUrl(supabase.storage.from("images").getPublicUrl(path).data.publicUrl);
    toast.success("Imagen subida");
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2 text-muted hover:border-brand" aria-label="Subir imagen">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : url ? <SmartImage src={url} alt="" fill sizes="80px" className="object-cover" /> : <ImagePlus className="h-6 w-6" />}
        </button>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… o sube un archivo" className="h-10" />
      </div>
      <input type="hidden" name={name} value={url} />
      <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}
