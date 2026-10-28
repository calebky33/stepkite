import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Donut, type DonutSlice } from "./Donut";

const slices: DonutSlice[] = [
  { key: "tax", label: "Income tax", value: 25, tone: "tax" },
  { key: "net", label: "Take-home", value: 75, tone: "positive" },
];

describe("Donut", () => {
  it("draws four equal neutral arcs and the placeholder label with no slices", () => {
    const { container } = render(
      <Donut
        slices={null}
        activeKey={null}
        onActiveChange={() => {}}
        label="Where your pay goes"
      />,
    );
    expect(screen.getByRole("img", { name: /no figures yet/i })).toBeTruthy();
    expect(screen.getByText("Placeholder, no figures yet")).toBeTruthy();
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(4);
    const dashes = new Set(Array.from(circles).map((c) => c.getAttribute("stroke-dasharray")));
    expect(dashes.size).toBe(1);
  });

  it("draws one arc per slice with the net slice in the positive colour", () => {
    const { container } = render(
      <Donut
        slices={slices}
        activeKey={null}
        onActiveChange={() => {}}
        label="Where your pay goes"
      />,
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    expect(circles[0]?.getAttribute("stroke")).toBe("var(--tax)");
    expect(circles[1]?.getAttribute("stroke")).toBe("var(--positive)");
    expect(screen.getByRole("img", { name: "Income tax, 25 percent" })).toBeTruthy();
    expect(screen.queryByText("Placeholder, no figures yet")).toBeNull();
  });

  it("reports hover and focus on an arc", () => {
    const onActive = vi.fn();
    render(<Donut slices={slices} activeKey={null} onActiveChange={onActive} label="Chart" />);
    const arc = screen.getByRole("img", { name: /Income tax/ });
    fireEvent.focus(arc);
    expect(onActive).toHaveBeenLastCalledWith("tax");
    fireEvent.blur(arc);
    expect(onActive).toHaveBeenLastCalledWith(null);
  });

  it("does not set the active arc from a tap", () => {
    const onActive = vi.fn();
    render(<Donut slices={slices} activeKey={null} onActiveChange={onActive} label="Chart" />);
    const arc = screen.getByRole("img", { name: /Income tax/ });
    fireEvent.pointerEnter(arc, { pointerType: "touch" });
    expect(onActive).not.toHaveBeenCalled();
  });
});
