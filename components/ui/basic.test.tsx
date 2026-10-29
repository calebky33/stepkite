import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { ProgressSteps } from "./ProgressSteps";
import { Skeleton } from "./Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "./Table";

describe("Button", () => {
  it("fires on click and is disabled while loading", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Check my pay</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Check my pay" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Button loading>Saving</Button>);
    const busy = screen.getByRole("button", { name: "Saving" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
  });
});

describe("IconButton", () => {
  it("takes its name from label and forwards ref and className", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<IconButton ref={ref} label="Move up" icon={<svg />} className="extra" />);
    const button = screen.getByRole("button", { name: "Move up" });
    expect(ref.current).toBe(button);
    expect(button.className).toContain("extra");
  });
});

describe("Input", () => {
  it("wires label, hint and error", () => {
    const { rerender } = render(<Input label="Annual salary" hint="Before tax" />);
    expect(
      screen.getByRole("textbox", { name: "Annual salary", description: "Before tax" }),
    ).toBeTruthy();
    rerender(<Input label="Annual salary" error="Enter a number." />);
    const field = screen.getByLabelText("Annual salary");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Enter a number.");
  });
});

describe("Badge, Card, Skeleton", () => {
  it("render their content", () => {
    render(
      <Card>
        <Badge>Scotland</Badge>
        <Skeleton data-testid="sk" />
      </Card>,
    );
    expect(screen.getByText("Scotland").getAttribute("title")).toBe("Scotland");
    expect(screen.getByTestId("sk")).toBeTruthy();
  });
});

describe("Table", () => {
  it("has table, column header and cell roles", () => {
    render(
      <Table label="Tax breakdown">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell numeric>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow selected>
            <TableCell>Income tax</TableCell>
            <TableCell numeric>3,486</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table", { name: "Tax breakdown" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByRole("cell", { name: "3,486" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Tax breakdown" }).getAttribute("tabindex")).toBe(
      "0",
    );
  });
});

describe("ProgressSteps", () => {
  it("marks the current step", () => {
    render(
      <ProgressSteps label="Build your CV" steps={["Basics", "Work", "Skills"]} current={1} />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]?.getAttribute("aria-current")).toBe("step");
    expect(items[0]?.hasAttribute("aria-current")).toBe(false);
  });
});
