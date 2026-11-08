import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", className)}>
      <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
      {Number(value).toFixed(1)}
      {count !== undefined && <span className="font-normal text-muted">({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})</span>}
    </span>
  );
}
