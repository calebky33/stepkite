import { TemplateBody, VARIANTS, type TemplateDef, type TemplateProps } from "../shared";

function UkClassic(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.ukClassic} />;
}

function UkModern(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.ukModern} />;
}

function UkCompact(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.ukCompact} />;
}

/**
 * Three single column, text only layouts. Section order comes from cv.sectionOrder, not from
 * the template. Dates are shown as short month and year, for example "Mar 2021".
 */
export const UK_TEMPLATES: TemplateDef[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Ruled headings, dates on their own line.",
    Component: UkClassic,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Coloured name and heading bars.",
    Component: UkModern,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter, fits more on two pages.",
    Component: UkCompact,
  },
];
