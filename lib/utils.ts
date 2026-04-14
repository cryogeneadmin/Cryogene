import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function coerceToDate(
  val: Date | { toDate?: () => Date } | string | number | null | undefined
): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (
    typeof val === "object" &&
    typeof (val as { toDate?: () => Date }).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}
