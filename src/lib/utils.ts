import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeTag(tag: string) {
  const enyeProtected = tag
    .replace(/Ñ/g, "__ENYE_UPPER__")
    .replace(/ñ/g, "__ENYE_LOWER__");

  return enyeProtected
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/__ENYE_UPPER__/g, "Ñ")
    .replace(/__ENYE_LOWER__/g, "ñ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTagForDisplay(tag: string) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function hasDiacritics(text: string) {
  return text.normalize("NFD") !== text;
}

export const ARCHIVED_TAG = "archivado";

export function normalizeTags(tags?: string[] | null) {
  if (!tags) return [];

  const uniqueTags = new Map<string, string>();

  tags.forEach((tag) => {
    const normalizedTagKey = normalizeTag(tag);
    if (!normalizedTagKey) return;

    const candidate = normalizeTagForDisplay(tag);
    if (!candidate) return;

    const existing = uniqueTags.get(normalizedTagKey);
    if (!existing) {
      uniqueTags.set(normalizedTagKey, candidate);
      return;
    }

    // Prefer the accented variant when both versions are equivalent.
    if (!hasDiacritics(existing) && hasDiacritics(candidate)) {
      uniqueTags.set(normalizedTagKey, candidate);
    }
  });

  return Array.from(uniqueTags.values());
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
