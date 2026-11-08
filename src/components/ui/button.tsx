import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

export const buttonStyles = ({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) =>
  cn(
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    {
      primary:
        "bg-brand text-brand-fg shadow-[0_8px_24px_-8px_var(--brand)] hover:bg-brand-strong hover:shadow-[0_10px_30px_-8px_var(--brand)]",
      secondary: "bg-fg text-bg hover:opacity-90",
      outline: "border border-border bg-surface hover:border-fg/30 hover:bg-surface-2",
      ghost: "hover:bg-surface-2",
      danger: "bg-danger text-white hover:opacity-90",
      success: "bg-success text-white hover:opacity-90",
    }[variant],
    {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-13 px-7 text-base",
      icon: "h-10 w-10",
    }[size],
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
