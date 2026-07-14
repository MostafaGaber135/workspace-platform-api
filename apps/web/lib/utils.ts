import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names (via `clsx`) and de-duplicates conflicting
 * Tailwind utilities (via `tailwind-merge`). This is the standard shadcn/ui
 * helper used by every UI primitive.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
