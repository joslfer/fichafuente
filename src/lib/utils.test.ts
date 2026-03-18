import { describe, expect, it } from "vitest";
import { normalizeTag, normalizeTagEquivalenceKey, normalizeTags } from "@/lib/utils";

describe("normalizeTag", () => {
  it("conserva la ñ", () => {
    expect(normalizeTag("NiÑo")).toBe("niño");
  });
});

describe("normalizeTagEquivalenceKey", () => {
  it("trata n y ñ como equivalentes", () => {
    expect(normalizeTagEquivalenceKey("nino")).toBe("nino");
    expect(normalizeTagEquivalenceKey("niño")).toBe("nino");
  });
});

describe("normalizeTags", () => {
  it("prefiere la variante acentuada cuando comparten clave equivalente", () => {
    expect(normalizeTags(["nino", "niño"])).toEqual(["niño"]);
  });

  it("unifica variantes n/ñ manteniendo una sola tag", () => {
    expect(normalizeTags(["canon", "cañon", "cañón"])).toEqual(["cañon"]);
  });
});
