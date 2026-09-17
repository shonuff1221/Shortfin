"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`transition-transform duration-300 ${open ? "" : "-rotate-90"}`}
    >
      <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Card with a collapsible body — smooth CSS height animation, state
 *  persisted in localStorage, full header row is the click target with a
 *  real button for keyboard/screen-reader users. */
export function CollapsibleCard({
  id,
  title,
  meta,
  children,
  defaultOpen = true,
  className,
}: {
  /** stable id for the persisted state key */
  id: string;
  title: ReactNode;
  /** right-aligned header meta (counts, badges…) */
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  // This component only mounts client-side (desk panels render after the
  // auth gate flips post-mount), so a lazy initializer can read localStorage
  // without hydration mismatch.
  const [open, setOpen] = useState(() => {
    try {
      const stored = window.localStorage.getItem(`shortfin.desk.collapsed.${id}`);
      return stored === null ? defaultOpen : stored !== "1";
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      try {
        window.localStorage.setItem(`shortfin.desk.collapsed.${id}`, next ? "0" : "1");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const regionId = `collapse-${id}`;

  return (
    <Card className={cn("card-hover overflow-hidden", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 p-4 pb-2 sm:p-5 sm:pb-2",
          "cursor-pointer select-none",
        )}
        onClick={toggle}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
          {meta}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          aria-label={open ? `Collapse ${typeof title === "string" ? title : "panel"}` : `Expand ${typeof title === "string" ? title : "panel"}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron open={open} />
        </button>
      </div>
      <div id={regionId} className="collapse-track" data-collapsed={!open}>
        <div className="collapse-inner">
          <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">{children}</CardContent>
        </div>
      </div>
    </Card>
  );
}
