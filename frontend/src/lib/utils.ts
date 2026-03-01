import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReferenceCase } from "@/lib/api";

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

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

export function isNewThisWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs < 7 * 24 * 60 * 60 * 1000;
}

export function computeQualityScore(c: ReferenceCase): number {
  let score = 0;
  if (c.customer_name) score += 20;
  if (c.challenge) score += 15;
  if (c.solution) score += 15;
  if (c.results) score += 15;
  if (c.quote) score += 10;
  if (c.customer_industry) score += 10;
  if (c.title) score += 5;
  if (c.customer_country) score += 5;
  if (c.products_used) {
    const products = c.products_used.split(",").map((p) => p.trim()).filter(Boolean);
    if (products.length > 0) score += 5;
  }
  return score;
}
