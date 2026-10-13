import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-border-strong bg-muted px-3 text-sm text-foreground",
      "placeholder:text-subtle-foreground transition-colors duration-200",
      "focus:border-brand focus:outline-none focus-visible:outline-none",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
