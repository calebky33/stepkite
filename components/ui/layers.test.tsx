import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Sheet } from "./Sheet";
import { Tabs } from "./Tabs";
import { ToastProvider, useToast } from "./Toast";
import { Tooltip } from "./Tooltip";
import { useCountTween } from "./useCountTween";

describe("Dialog", () => {
  it("opens with a title and closes with Escape", () => {
    render(
      <Dialog
        trigger={<Button>Open</Button>}
        title="Reset all fields"
        description="This clears your inputs."
      >
        <p>Body</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog", { name: "Reset all fields" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Sheet", () => {
  it("renders a named dialog with a close button", () => {
    render(<Sheet defaultOpen title="Filters" />);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});

describe("Tabs", () => {
  it("has tab roles and moves with arrow keys", async () => {
    render(
      <Tabs
        label="Views"
        tabs={[
          { value: "a", label: "Summary", content: <p>Summary body</p> },
          { value: "b", label: "Details", content: <p>Details body</p> },
        ]}
      />,
    );
    expect(screen.getByRole("tablist", { name: "Views" })).toBeTruthy();
    const first = screen.getByRole("tab", { name: "Summary" });
    expect(first.getAttribute("aria-selected")).toBe("true");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Details" })));
    await vi.waitFor(() =>
      expect(screen.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("true"),
    );
    expect(screen.getByRole("tabpanel")).toBeTruthy();
  });
});

function ToastDemo() {
  const { toast } = useToast();
  return <Button onClick={() => toast({ title: "Saved on this device." })}>Save</Button>;
}

describe("Toast", () => {
  it("shows a toast from the hook", () => {
    render(
      <ToastProvider>
        <ToastDemo />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Saved on this device.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });

  it("throws a clear error without a provider", () => {
    const spy = vi.spyOn(globalThis.console, "error").mockImplementation(() => {});
    expect(() => render(<ToastDemo />)).toThrow("useToast needs a ToastProvider");
    spy.mockRestore();
  });
});

describe("Tooltip", () => {
  it("shows on focus with the tooltip role", async () => {
    render(
      <Tooltip content="Move this section up">
        <Button>Up</Button>
      </Tooltip>,
    );
    await act(async () => {
      screen.getByRole("button", { name: "Up" }).focus();
    });
    expect((await screen.findAllByText("Move this section up")).length).toBeGreaterThan(0);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });
});

function Count({ n }: { n: number }) {
  return <output>{Math.round(useCountTween(n))}</output>;
}

describe("useCountTween", () => {
  it("starts at the target and lands on a new one", async () => {
    const { rerender } = render(<Count n={10} />);
    expect(screen.getByRole("status").textContent).toBe("10");
    rerender(<Count n={20} />);
    await vi.waitFor(() => expect(screen.getByRole("status").textContent).toBe("20"));
  });
});
