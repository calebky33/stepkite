import { TemplateBody, VARIANTS, type TemplateDef, type TemplateProps } from "../shared";

function InClassic(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.inClassic} />;
}

function InModern(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.inModern} />;
}

function InCompact(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.inCompact} />;
}

/**
 * Three single column, text only layouts. Section order comes from cv.sectionOrder, not from
 * the template. Dates are shown as short month and year, for example "Mar 2021 to present".
 */
export const IN_TEMPLATES: TemplateDef[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Ruled headings, dates on their own line.",
    Component: InClassic,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Coloured name and heading bars.",
    Component: InModern,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter, fits more on one page.",
    Component: InCompact,
  },
];
