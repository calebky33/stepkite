import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

const printing = vi.hoisted(() => ({
  mode: "ok" as "ok" | "error",
  options: {} as { onAfterPrint?: () => void; onPrintError?: () => void; documentTitle?: string },
}));
vi.mock("react-to-print", () => ({
  useReactToPrint: (options: typeof printing.options) => {
    printing.options = options;
    return () => {
      if (printing.mode === "error") options.onPrintError?.();
      else options.onAfterPrint?.();
    };
  },
}));

import { getCvRules } from "@/lib/cv/rules";
import { readAll } from "@/lib/storage/db";
import { resetMemoryDb } from "@/lib/storage/memoryDb";
import { z } from "zod";
import { PdfDownload } from "./PdfDownload";

function setup(disabledReason: string | null = null) {
  const ref = createRef<HTMLDivElement>();
  const view = render(
    <>
      <div ref={ref}>pages</div>
      <PdfDownload
        contentRef={ref}
        cvId="cv-1"
        title="Graduate UK"
        fullName="Asha Rao"
        rules={getCvRules("uk")}
        disabledReason={disabledReason}
      />
    </>,
  );
  return view;
}

beforeEach(() => {
  resetMemoryDb();
  printing.mode = "ok";
});

describe("PdfDownload", () => {
  it("names the file from the CV name and today's date", () => {
    setup();
    expect(printing.options.documentTitle).toMatch(/^Graduate-UK-\d{4}-\d{2}-\d{2}$/);
  });

  it("asks once after a download and stores the answer on the device", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(screen.getByText("Did this work for your application?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() =>
      expect(screen.queryByText("Did this work for your application?")).toBeNull(),
    );
    const all = await readAll("cv-feedback", z.object({ answer: z.string() }));
    expect(all.ok && all.value.items.map((i) => i.answer)).toEqual(["yes"]);
  });

  it("can be dismissed without saving anything", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Did this work for your application?")).toBeNull();
    const all = await readAll("cv-feedback", z.object({ answer: z.string() }));
    expect(all.ok && all.value.items).toEqual([]);
  });

  it("shows a plain message and a retry when printing fails", () => {
    printing.mode = "error";
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(screen.getByText(/The download did not start/)).toBeTruthy();
    printing.mode = "ok";
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.queryByText(/The download did not start/)).toBeNull();
    expect(screen.getByText("Did this work for your application?")).toBeTruthy();
  });

  it("is off, with the reason, when there is nothing of the person's own to print", () => {
    setup("Add your name or a section first.");
    const button = screen.getByRole("button", { name: "Download PDF" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Add your name or a section first.")).toBeTruthy();
  });
});
