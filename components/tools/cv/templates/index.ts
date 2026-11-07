import type { CountryCode } from "@/lib/countries";
import { IN_TEMPLATES } from "./in";
import type { TemplateDef } from "./shared";
import { UK_TEMPLATES } from "./uk";
import { US_TEMPLATES } from "./us";

export type { TemplateDef, TemplateProps } from "./shared";

const BY_COUNTRY: Partial<Record<CountryCode, TemplateDef[]>> = {
  uk: UK_TEMPLATES,
  us: US_TEMPLATES,
  in: IN_TEMPLATES,
};

/** Markets without their own researched template set use the US set as a neutral English base. */
export function templatesFor(country: CountryCode): TemplateDef[] {
  return BY_COUNTRY[country] ?? US_TEMPLATES;
}

/** An unknown id (for example from an older save) falls back to the first template. */
export function resolveTemplate(country: CountryCode, id: string): TemplateDef {
  const list = templatesFor(country);
  return list.find((t) => t.id === id) ?? list[0] ?? UK_TEMPLATES[0]!;
}
