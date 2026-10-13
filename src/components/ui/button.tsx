import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "up" | "down";
type Size = "default" | "sm" | "lg";

const variants: Record<Variant, string> = {
  default:
    "bg-brand text-background hover:bg-brand-strong",
  outline:
    "border border-border-strong bg-transparent text-foreground hover:bg-raised hover:border-brand/50",
  ghost: "bg-transparent text-muted-foreground hover:bg-raised hover:text-foreground",
  up: "bg-up/15 text-up border border-up/30 hover:bg-up/25",
  down: "bg-down/15 text-down border border-down/30 hover:bg-down/25",
};

const sizes: Record<Size, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors duration-200",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
