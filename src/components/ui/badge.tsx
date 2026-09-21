import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "up" | "down" | "warn" | "info";

const tones: Record<Tone, string> = {
  neutral: "border-border-strong bg-muted text-muted-foreground",
  brand: "border-brand/40 bg-brand-soft text-brand",
  up: "border-up/40 bg-up-soft text-up",
  down: "border-down/40 bg-down-soft text-down",
  warn: "border-warn/40 bg-warn-soft text-warn",
  info: "border-info/40 bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
