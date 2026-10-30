import { TemplateBody, VARIANTS, type TemplateDef, type TemplateProps } from "../shared";

function InPlain(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.plain} />;
}

function InCompact(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.compact} />;
}

function InCentred(props: TemplateProps) {
  return <TemplateBody {...props} variant={VARIANTS.centred} />;
}

/** Placeholder designs. Final templates replace these once country rules are signed off. */
export const IN_TEMPLATES: TemplateDef[] = [
  {
    id: "plain",
    name: "Plain",
    description: "Left aligned, one column.",
    Component: InPlain,
    placeholder: true,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter, fits more on a page.",
    Component: InCompact,
    placeholder: true,
  },
  {
    id: "sidebar-free",
    name: "No sidebar",
    description: "Centred heading, one column.",
    Component: InCentred,
    placeholder: true,
  },
];
