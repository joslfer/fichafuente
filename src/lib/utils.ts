import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
