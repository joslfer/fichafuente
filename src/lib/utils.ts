import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeTag(tag: string) {
  return tag
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTags(tags?: string[] | null) {
  if (!tags) return [];

  const uniqueTags = new Set<string>();

  tags.forEach((tag) => {
    const normalizedTag = normalizeTag(tag);
    if (normalizedTag) {
      uniqueTags.add(normalizedTag);
    }
  });

  return Array.from(uniqueTags);
}

export function isDoiSourceUrl(url?: string | null) {
  if (!url) return false;

  const normalizedUrl = url.trim().toLowerCase();
  if (!normalizedUrl) return false;

  if (normalizedUrl.includes("doi.org/") || normalizedUrl.includes("dx.doi.org/")) {
    return true;
  }

  return /(?:doi:\s*)?10\.\d{4,9}\/[\w.()/:;-]+/i.test(normalizedUrl);
}
