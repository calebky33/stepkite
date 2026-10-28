import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InFields } from "./InFields";
import { buildOptions, DEFAULT_VALUES } from "./options";
import { UkFields } from "./UkFields";
import { UsFields } from "./UsFields";

const none = () => {};

describe("country fields", () => {
  it("UkFields labels every control and shows a pension error", () => {
    render(
      <UkFields
        values={DEFAULT_VALUES.uk}
        errors={{ pensionPercent: "Enter a percentage from 0 to 100." }}
        onChange={none}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Where you work" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Pension contribution" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "How your pension is taken" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Student loan" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Enter a percentage from 0 to 100.");
  });

  it("UsFields labels every control and reports changes", () => {
    const onChange = vi.fn();
    render(<UsFields values={DEFAULT_VALUES.us} errors={{}} onChange={onChange} />);
    expect(screen.getByRole("combobox", { name: "State" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Filing status" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Pay frequency" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Pre-tax 401(k) contribution" }), {
      target: { value: "6" },
    });
    expect(onChange).toHaveBeenCalledWith("retirementPercent", "6");
  });

  it("InFields hides old regime inputs for the new regime", () => {
    render(<InFields values={DEFAULT_VALUES.in} errors={{}} onChange={none} />);
    expect(screen.getByRole("radio", { name: "New regime" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "State" })).toBeTruthy();
    expect(screen.getByText(/provident fund/i)).toBeTruthy();
    expect(screen.queryByText("Section 80C investments")).toBeNull();
  });

  it("InFields shows 80C, 80D and HRA inputs for the old regime", () => {
    render(
      <InFields values={{ ...DEFAULT_VALUES.in, regime: "old" }} errors={{}} onChange={none} />,
    );
    const names = [
      "Section 80C investments",
      "Section 80D health insurance",
      "HRA you receive",
      "Rent you pay",
    ];
    for (const name of names) {
      expect(screen.getByRole("textbox", { name })).toBeTruthy();
    }
  });
});

describe("buildOptions", () => {
  it("parses numbers, leaves out blanks and flags bad input", () => {
    const ok = buildOptions("uk", { ...DEFAULT_VALUES.uk, pensionPercent: "5" });
    expect(ok.options.pensionPercent).toBe(5);
    expect(ok.region).toBe("england");
    expect(buildOptions("uk", DEFAULT_VALUES.uk).options).not.toHaveProperty("pensionPercent");
    const high = buildOptions("uk", { ...DEFAULT_VALUES.uk, pensionPercent: "150" });
    expect(high.errors).toHaveProperty("pensionPercent");
    const text = buildOptions("uk", { ...DEFAULT_VALUES.uk, pensionPercent: "abc" });
    expect(text.errors).toHaveProperty("pensionPercent");
  });

  it("drops old regime options under the new regime", () => {
    const values = { ...DEFAULT_VALUES.in, section80c: "100000" };
    expect(buildOptions("in", values).options).not.toHaveProperty("section80c");
    expect(buildOptions("in", { ...values, regime: "old" }).options.section80c).toBe(100000);
  });
});
