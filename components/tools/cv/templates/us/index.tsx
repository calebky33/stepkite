import { TemplateBody, VARIANTS, type TemplateDef, type TemplateProps } from "../shared";

function UsPlain(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.plain} />;
}

function UsCompact(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.compact} />;
}

function UsCentred(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.centred} />;
}

/** Placeholder designs. Final templates replace these once country rules are signed off. */
export const US_TEMPLATES: TemplateDef[] = [
  {
    id: "plain",
    name: "Plain",
    description: "Left aligned, one column.",
    Component: UsPlain,
    placeholder: true,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter, fits more on a page.",
    Component: UsCompact,
    placeholder: true,
  },
  {
    id: "sidebar-free",
    name: "No sidebar",
    description: "Centred heading, one column.",
    Component: UsCentred,
    placeholder: true,
  },
];
