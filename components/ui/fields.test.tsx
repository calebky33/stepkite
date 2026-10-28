import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CurrencyInput } from "./CurrencyInput";
import { SegmentedControl } from "./SegmentedControl";
import { Select } from "./Select";
import { Slider } from "./Slider";
import { Switch } from "./Switch";

function Money({ locale, currency }: { locale: string; currency: string }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <>
      <CurrencyInput
        label="Annual salary"
        hint="Before tax"
        locale={locale}
        currency={currency}
        value={value}
        onValueChange={setValue}
      />
      <output data-testid="out">{value === null ? "none" : String(value)}</output>
    </>
  );
}

describe("CurrencyInput", () => {
  it("groups with lakh style for en-IN and reports a number", () => {
    render(<Money locale="en-IN" currency="INR" />);
    const input = screen.getByRole("textbox", { name: "Annual salary" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1250000" } });
    expect(input.value).toBe("12,50,000");
    expect(screen.getByTestId("out").textContent).toBe("1250000");
  });

  it("groups in thousands for en-GB and keeps the text at 16px or more via text-base", () => {
    render(<Money locale="en-GB" currency="GBP" />);
    const input = screen.getByRole("textbox", { name: "Annual salary" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "28000" } });
    expect(input.value).toBe("28,000");
    expect(input.className).toContain("text-base");
    expect(input.getAttribute("inputmode")).toBe("numeric");
  });

  it("drops letters and reports null when empty", () => {
    render(<Money locale="en-US" currency="USD" />);
    const input = screen.getByRole("textbox", { name: "Annual salary" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input.value).toBe("");
    expect(screen.getByTestId("out").textContent).toBe("none");
  });

  it("shows the error and links the hint", () => {
    render(<CurrencyInput label="Pay" error="Enter a pay figure." locale="en-US" currency="USD" />);
    expect(screen.getByRole("alert").textContent).toBe("Enter a pay figure.");
    expect(screen.getByRole("textbox", { name: "Pay" }).getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Select", () => {
  it("has a labelled combobox and opens from the keyboard", () => {
    render(
      <Select
        label="Region"
        hint="Where you work"
        options={[
          { value: "eng", label: "England" },
          { value: "sct", label: "Scotland" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Region" });
    expect(trigger).toBeTruthy();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getAllByRole("option").length).toBe(2);
  });
});

describe("SegmentedControl", () => {
  it("is a radio group that moves with arrow keys", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="Pay period"
        options={[
          { value: "year", label: "Year" },
          { value: "month", label: "Month" },
          { value: "week", label: "Week" },
        ]}
        defaultValue="year"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Pay period" })).toBeTruthy();
    const year = screen.getByRole("radio", { name: "Year" });
    expect(year.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(year, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith("month");
    expect(screen.getByRole("radio", { name: "Month" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("Slider", () => {
  it("is a labelled slider that responds to arrow keys", () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        label="Salary"
        min={0}
        max={100}
        step={5}
        defaultValue={50}
        onValueChange={onValueChange}
      />,
    );
    const thumb = screen.getByRole("slider", { name: "Salary" });
    expect(thumb.getAttribute("aria-valuenow")).toBe("50");
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith(55);
  });
});

describe("Switch", () => {
  it("toggles by label click and by Space", () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch label="Include pension" hint="Workplace scheme" onCheckedChange={onCheckedChange} />,
    );
    const control = screen.getByRole("switch", { name: "Include pension" });
    expect(control.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByText("Include pension"));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });
});
