import { Badge } from "@/components/ui/Badge";
import { resolveTemplate } from "@/components/tools/cv/templates";
import { cn } from "@/components/ui/cn";
import { exampleCv } from "@/lib/cv/example";
import { buildBlocks } from "@/lib/cv/paginate";
import { emptyCv } from "@/lib/cv/schema";
import { clampStyle } from "@/lib/cv/style";

/** A4 at 96 dpi. The preview is drawn at true size, then scaled down with a transform. */
const PAGE_W = 794;
const PAGE_H = 1123;
const PX_PER_MM = 96 / 25.4;

const previewCv = exampleCv(emptyCv("home-preview", "uk", "2026-01-01T00:00:00.000Z"));
const blocks = buildBlocks(previewCv);
const template = resolveTemplate("uk", previewCv.templateId);
const Template = template.Component;
const margin = clampStyle(previewCv.style).marginMm * PX_PER_MM;

type CvPreviewProps = {
  className?: string;
  /** Visible caption above the paper. Turn off when the surrounding card already explains it. */
  showCaption?: boolean;
  /** Smaller paper for cards that also carry a column of text. */
  compact?: boolean;
  /** Distinct accessible name when the page shows more than one preview. */
  label?: string;
};

/**
 * A real CV render from the same template the builder uses, shown as an example. It is a
 * server component, so the landing page pays no JavaScript for it.
 */
export function CvPreview({
  className,
  showCaption = true,
  compact = false,
  label = "Example CV page from the CV builder",
}: CvPreviewProps) {
  return (
    <figure
      className={cn(
        "flex flex-col items-center gap-3",
        compact ? "[--paper-scale:0.3]" : "[--paper-scale:0.34] sm:[--paper-scale:0.42]",
        className,
      )}
    >
      {showCaption ? (
        <figcaption
          className="flex shrink-0 items-center justify-between gap-3"
          style={{ width: `calc(${PAGE_W}px * var(--paper-scale))`, maxWidth: "100%" }}
        >
          <span className="text-sm text-muted">Example CV</span>
          <Badge>Preview</Badge>
        </figcaption>
      ) : null}
      <div
        role="img"
        aria-label={label}
        className="relative shrink-0 overflow-hidden rounded-card border border-border bg-white shadow-pop"
        style={{
          width: `calc(${PAGE_W}px * var(--paper-scale))`,
          height: `calc(${PAGE_H}px * var(--paper-scale))`,
        }}
      >
        <div
          className="origin-top-left bg-white"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            padding: margin,
            transform: "scale(var(--paper-scale))",
          }}
        >
          <Template cv={previewCv} blocks={blocks} locale="en-GB" />
        </div>
      </div>
    </figure>
  );
}
