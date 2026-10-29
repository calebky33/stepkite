import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

type Row = { feature: string; free: string; pro: string; building?: boolean };

/** Features come from docs/PRODUCT.md. `building` marks tools that are not finished. */
const ROWS: Row[] = [
  { feature: "Pay calculators", free: "All of them", pro: "All of them", building: true },
  {
    feature: "CV builder",
    free: "3 templates for each country",
    pro: "Extra templates too",
    building: true,
  },
  { feature: "PDF download without an account", free: "Yes", pro: "Yes", building: true },
  { feature: "ATS check", free: "Yes", pro: "Yes", building: true },
  { feature: "Job tracker on your device", free: "Yes", pro: "Yes" },
  { feature: "Job ad matching", free: "1 a month", pro: "Unlimited", building: true },
  { feature: "Offer comparison", free: "Yes", pro: "Yes", building: true },
  { feature: "Tailored CV versions", free: "No", pro: "Yes", building: true },
  { feature: "Cover letters", free: "No", pro: "Yes", building: true },
  { feature: "Sync between your devices", free: "No", pro: "Yes", building: true },
  { feature: "Ads", free: "On calculator pages only", pro: "None" },
];

export function PricingTable() {
  return (
    <section aria-labelledby="compare-plans" className="mt-12 flex flex-col gap-6">
      <h2 id="compare-plans" className="font-display text-[22px] leading-tight md:text-[28px]">
        Free and Pro side by side
      </h2>
      <Table label="Free and Pro features">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Feature</TableHeaderCell>
            <TableHeaderCell>Free</TableHeaderCell>
            <TableHeaderCell>Pro Pass</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.feature}>
              <TableHeaderCell scope="row" className="text-base text-text">
                {row.feature}
                {row.building ? (
                  <>
                    {" "}
                    <Badge>Being built</Badge>
                  </>
                ) : null}
              </TableHeaderCell>
              <TableCell>{row.free}</TableCell>
              <TableCell>{row.pro}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted">
        Tools marked Being built are not ready yet. The Pass opens when they are.
      </p>
    </section>
  );
}
