import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { Cv } from "@/lib/cv/schema";
import { ExperienceEditor } from "./ExperienceEditor";
import { SkillsEditor } from "./SkillsEditor";

function Harness({ initial = [] as Cv["experience"] }) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <ExperienceEditor items={items} onChange={setItems} />
      <output data-testid="roles">{items.map((j) => j.role).join("|")}</output>
    </>
  );
}

const roles = () => screen.getByTestId("roles").textContent;
const job = (id: string, role: string): Cv["experience"][number] => ({
  id,
  role,
  employer: "",
  location: "",
  start: "2024-01",
  end: null,
  bullets: [],
});

describe("section editor entries", () => {
  it("adds and removes a job", () => {
    render(<Harness />);
    expect(screen.getByText(/No jobs added yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a job" }));
    expect(screen.getByRole("group", { name: "Job 1 actions" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove job 1" }));
    expect(screen.queryByRole("group", { name: "Job 1 actions" })).toBeNull();
  });

  it("moves entries up and down and disables the ends", () => {
    render(<Harness initial={[job("a", "First"), job("b", "Second"), job("c", "Third")]} />);
    const up1 = screen.getByRole("button", { name: "Move job 1 up" }) as HTMLButtonElement;
    expect(up1.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Move job 3 down" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Move job 2 up" }));
    expect(roles()).toBe("Second|First|Third");
    fireEvent.click(screen.getByRole("button", { name: "Move job 2 down" }));
    expect(roles()).toBe("Second|Third|First");
  });

  it("announces a move politely", () => {
    const { container } = render(<Harness initial={[job("a", "First"), job("b", "Second")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Move job 2 up" }));
    expect(container.querySelector("[aria-live=polite]")?.textContent).toContain("moved up");
  });

  it("shows an error when the end is before the start", () => {
    render(<Harness initial={[{ ...job("a", "First"), end: "2023-01" }]} />);
    expect(screen.getByRole("alert").textContent).toContain("before the start");
  });

  it("keeps a typed comma in a skill group", () => {
    function Skills() {
      const [items, setItems] = useState<Cv["skills"]>([{ id: "s", label: "", items: [] }]);
      return (
        <>
          <SkillsEditor items={items} onChange={setItems} />
          <output data-testid="skills">{items[0]?.items.join("|")}</output>
        </>
      );
    }
    render(<Skills />);
    const field = screen.getByLabelText("Skills") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "Excel, " } });
    expect(field.value).toBe("Excel, ");
    expect(screen.getByTestId("skills").textContent).toBe("Excel");
  });
});
