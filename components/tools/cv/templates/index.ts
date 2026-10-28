import type { CountryCode } from "@/lib/countries";
import { IN_TEMPLATES } from "./in";
import type { TemplateDef } from "./shared";
import { UK_TEMPLATES } from "./uk";
import { US_TEMPLATES } from "./us";

export type { TemplateDef, TemplateProps } from "./shared";

const BY_COUNTRY: Record<CountryCode, TemplateDef[]> = {
  uk: UK_TEMPLATES,
  us: US_TEMPLATES,
  in: IN_TEMPLATES,
};

export function templatesFor(country: CountryCode): TemplateDef[] {
  return BY_COUNTRY[country];
}

/** An unknown id (for example from an older save) falls back to the first template. */
export function resolveTemplate(country: CountryCode, id: string): TemplateDef {
  const list = BY_COUNTRY[country];
  return list.find((t) => t.id === id) ?? list[0] ?? UK_TEMPLATES[0]!;
}
