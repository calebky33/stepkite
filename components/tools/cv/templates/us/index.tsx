import { TemplateBody, VARIANTS, type TemplateDef, type TemplateProps } from "../shared";

function UsClassic(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.usClassic} />;
}

function UsModern(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.usModern} />;
}

function UsCompact(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.usCompact} />;
}

/**
 * Three single column, text only layouts. Section order comes from cv.sectionOrder, not from
 * the template. Dates are shown as short month and year, for example "Mar 2021 to present".
 */
export const US_TEMPLATES: TemplateDef[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Ruled headings, dates on their own line.",
    Component: UsClassic,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Coloured name and heading bars.",
    Component: UsModern,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter, fits more on one page.",
    Component: UsCompact,
  },
];
