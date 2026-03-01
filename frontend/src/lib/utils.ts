import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(str: string | null | undefined, len: number): string {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  }
}
