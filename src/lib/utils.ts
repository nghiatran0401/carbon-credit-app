import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to add base path to URLs (matches quy-bao-tro-tre-em pattern)
export function withBasePath(path: string) {
  const prefix = process.env.NEXT_PUBLIC_APP_URL || "";
  return `${prefix}${path}`;
}
