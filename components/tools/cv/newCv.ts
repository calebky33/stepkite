import type { CountryCode } from "@/lib/countries";
import { emptyCv, type Cv } from "@/lib/cv/schema";
import { clampStyle } from "@/lib/cv/style";
import { resolveTemplate, templatesFor } from "./templates";

/**
 * The template registry lives in components, so the first template id is resolved here and
 * not in lib/cv/schema.ts, which would invert the layering.
 */
export function newCv(id: string, country: CountryCode, nowIso: string): Cv {
  const base = emptyCv(id, country, nowIso);
  return { ...base, templateId: templatesFor(country)[0]?.id ?? base.templateId };
}

/** Clamps style values and swaps an unknown template id (an older save) for the country's first. */
export function prepareLoaded(cv: Cv, country: CountryCode): Cv {
  return {
    ...cv,
    style: clampStyle(cv.style),
    templateId: resolveTemplate(country, cv.templateId).id,
  };
}
