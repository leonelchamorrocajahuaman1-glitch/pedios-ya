"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SmartImage } from "@/components/ui/smart-image";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const GALLERY_MAX = 8;

/** Sube varias fotos al bucket público "images" (solo admins) y permite ordenarlas o quitarlas. */
export async function uploadImage(file: File, folder: string): Promise<string | null> {
  if (!TYPES.includes(file.type)) {
    toast.error(`${file.name}: formato no permitido (JPG, PNG, WebP o AVIF)`);
    return null;
  }
  if (file.size > MAX) {
    toast.error(`${file.name}: supera 5 MB`);
    return null;
  }
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (error) {
    toast.error(`No se pudo subir ${file.name}: ${error.message}`);
    return null;
  }
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

export function GalleryUpload({ name, value, onChange, folder = "products" }: { name: string; value: string[]; onChange: (urls: string[]) => void; folder?: string }) {
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList) {
    const room = GALLERY_MAX - value.length;
    if (room <= 0) return void toast.error(`Máximo ${GALLERY_MAX} fotos en la galería`);
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      const url = await uploadImage(f, folder);
      if (url) urls.push(url);
    }
    setUploading(false);
    if (urls.length) {
      onChange([...value, ...urls]);
      toast.success(`${urls.length} foto(s) subida(s)`);
    }
    if (input.current) input.current.value = "";
  }
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">Galería <span className="font-normal text-muted">({value.length}/{GALLERY_MAX})</span></span>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, i) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2">
            <SmartImage src={url} alt={`Foto ${i + 1}`} fill sizes="120px" className="object-cover" />
            <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30" aria-label="Mover a la izquierda"><ArrowLeft className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30" aria-label="Mover a la derecha"><ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white" aria-label="Quitar foto"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {value.length < GALLERY_MAX && (
          <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="grid aspect-square place-items-center rounded-2xl border border-dashed border-border bg-surface-2 text-muted hover:border-brand" aria-label="Agregar fotos">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="h-6 w-6" /> Agregar</span>}
          </button>
        )}
      </div>
      <p className="text-xs text-muted">JPG, PNG, WebP o AVIF · máx. 5 MB por foto. Puedes elegir varias a la vez desde tu equipo o celular.</p>
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      <input ref={input} type="file" multiple accept={TYPES.join(",")} className="hidden" onChange={(e) => e.target.files?.length && onFiles(e.target.files)} />
    </div>
  );
}
