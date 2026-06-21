import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts so the last-wins rule
 * applies to utilities (e.g. `cn("p-2", "p-4")` → `"p-4"`). Used by every
 * shadcn/ui component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
