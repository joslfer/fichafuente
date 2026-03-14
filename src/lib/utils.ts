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

export const ARCHIVED_TAG = "archivado";

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

export function isArchivedTag(tag: string) {
  return normalizeTag(tag) === ARCHIVED_TAG;
}

export function orderTagsForDisplay(tags?: string[] | null) {
  const uniqueTags = Array.from(new Set((tags ?? []).filter(Boolean)));
  const regularTags = uniqueTags.filter((tag) => !isArchivedTag(tag));
  const archivedTags = uniqueTags.filter((tag) => isArchivedTag(tag));

  return [...regularTags, ...archivedTags];
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
