/** Join class names, skipping falsy — tiny cn() (no deps). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
