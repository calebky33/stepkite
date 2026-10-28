import { TemplateBody, VARIANTS, type TemplateDef, type TemplateProps } from "../shared";

function UkPlain(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.plain} />;
}

function UkCompact(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.compact} />;
}

function UkCentred(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.centred} />;
}

/** Placeholder designs. Final templates replace these once country rules are signed off. */
export const UK_TEMPLATES: TemplateDef[] = [
  { id: "plain", name: "Plain", description: "Left aligned, one column.", Component: UkPlain },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter, fits more on a page.",
    Component: UkCompact,
  },
  {
    id: "sidebar-free",
    name: "No sidebar",
    description: "Centred heading, one column.",
    Component: UkCentred,
  },
];
