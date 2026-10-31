import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddJob } from "./AddJob";
import { READ_LINK_NOTICE, READ_MESSAGES, readLink, type ReadReason } from "./previewClient";
import { type } from "./testkit.test-util";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function openLinkMode() {
  fireEvent.click(screen.getByRole("radio", { name: "Read link" }));
}

describe("AddJob", () => {
  it("adds a job from the form with the country's currency on the pay", () => {
    const onAdd = vi.fn();
    render(<AddJob country="in" stageId="stage-saved" onAdd={onAdd} />);
    fireEvent.click(screen.getByText("More details"));
    expect((screen.getByLabelText("Currency") as HTMLSelectElement).value).toBe("INR");
    type("Job title", "Analyst");
    type("Company", "Acme");
    type("Lowest figure", "900000");
    type("Paid", "monthly");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({
      title: "Analyst",
      stageId: "stage-saved",
      salary: { min: 900000, currency: "INR", period: "monthly" },
    });
  });

  it("opens the extra fields when one of them has an error", () => {
    render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    type("Job title", "Analyst");
    type("Company", "Acme");
    fireEvent.click(screen.getByText("More details"));
    type("Lowest figure", "lots");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(screen.getByText(/as a number/)).toBeTruthy();
  });

  it("keeps pasted job text in the notes", () => {
    const onAdd = vi.fn();
    render(<AddJob country="us" stageId="stage-saved" onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("radio", { name: "Paste text" }));
    type("Job title", "Analyst");
    type("Company", "Acme");
    type("Job text", "We are hiring.");
    fireEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({ notes: "We are hiring." });
  });

  it("says what is sent before anything is sent, then fills editable suggestions", async () => {
    const fetchMock = stubFetch({
      ok: true,
      title: "<b>Payroll analyst</b>",
      company: "Northwind",
    });
    render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    openLinkMode();
    expect(screen.getByText(READ_LINK_NOTICE)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    type("Link to the job ad", "https://example.com/ad");
    fireEvent.click(screen.getByRole("button", { name: "Read the link" }));
    await waitFor(() => expect(screen.getByText(/only suggestions/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/job-preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/ad" }),
      }),
    );
    // Shown as plain text in an input, never as markup.
    expect((screen.getByLabelText("Job title") as HTMLInputElement).value).toBe(
      "<b>Payroll analyst</b>",
    );
    type("Job title", "Payroll lead");
    expect((screen.getByLabelText("Job title") as HTMLInputElement).value).toBe("Payroll lead");
  });

  it("adds a check this hint when the title came from the page heading", async () => {
    stubFetch({ ok: true, title: "Analyst | Acme Careers", titleSource: "title" }, 200);
    render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    openLinkMode();
    type("Link to the job ad", "https://example.com/ad");
    fireEvent.click(screen.getByRole("button", { name: "Read the link" }));
    expect(await screen.findByText(/may include extra words/)).toBeTruthy();
  });

  it("checks the link before sending it", () => {
    const fetchMock = stubFetch({ ok: true });
    render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    openLinkMode();
    type("Link to the job ad", "nope");
    fireEvent.click(screen.getByRole("button", { name: "Read the link" }));
    expect(screen.getByText(/starts with http or https/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the link on Enter in the URL input instead of submitting the form", async () => {
    const onAdd = vi.fn();
    const fetchMock = stubFetch({ ok: true, title: "Payroll analyst", company: "Northwind" });
    render(<AddJob country="uk" stageId="stage-saved" onAdd={onAdd} />);
    openLinkMode();
    const url = screen.getByLabelText("Link to the job ad");
    fireEvent.change(url, { target: { value: "https://example.com/ad" } });
    fireEvent.keyDown(url, { key: "Enter" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("fills only empty fields on a read, so typing is preserved", async () => {
    stubFetch({ ok: true, title: "Suggested", company: "Suggested co" });
    render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    openLinkMode();
    type("Job title", "My own title");
    type("Link to the job ad", "https://example.com/ad");
    fireEvent.click(screen.getByRole("button", { name: "Read the link" }));
    await waitFor(() => expect(screen.getByText(/only suggestions/)).toBeTruthy());
    // Title the user already typed stays. The empty company fills from the read.
    expect((screen.getByLabelText("Job title") as HTMLInputElement).value).toBe("My own title");
    expect((screen.getByLabelText("Company") as HTMLInputElement).value).toBe("Suggested co");
  });

  it("aborts a pending read when the component unmounts, so a stale result cannot land", async () => {
    const signals: AbortSignal[] = [];
    let resolveFetch: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise<Response>((resolve) => (resolveFetch = resolve));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    openLinkMode();
    type("Link to the job ad", "https://example.com/ad");
    fireEvent.click(screen.getByRole("button", { name: "Read the link" }));
    await waitFor(() => expect(signals).toHaveLength(1));
    unmount();
    expect(signals[0]?.aborted).toBe(true);
    // Resolving after unmount must not throw or touch any state.
    resolveFetch(new Response(JSON.stringify({ ok: true, title: "After unmount" })));
    await new Promise((r) => setTimeout(r, 0));
  });

  it("shows a specific message for a refused read", async () => {
    stubFetch({ ok: false, reason: "blocked" });
    render(<AddJob country="uk" stageId="stage-saved" onAdd={vi.fn()} />);
    openLinkMode();
    type("Link to the job ad", "https://example.com/ad");
    fireEvent.click(screen.getByRole("button", { name: "Read the link" }));
    expect((await screen.findByRole("alert")).textContent).toBe(READ_MESSAGES.blocked);
  });
});

describe("readLink", () => {
  const reasons: ReadReason[] = [
    "blocked",
    "not-html",
    "too-large",
    "timeout",
    "no-details",
    "invalid",
    "fetch-failed",
    "rate-limited",
    "forbidden",
    "not-found",
    "blocked-by-site",
    "read-failed",
  ];

  it.each(reasons)("passes the %s reason through with its own message", async (reason) => {
    const doFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, reason })));
    const result = await readLink("https://example.com", doFetch);
    expect(result).toEqual({ ok: false, reason });
    expect(READ_MESSAGES[reason].length).toBeGreaterThan(10);
  });

  it("maps 429 and 403 without a body, and a network failure", async () => {
    const status = (code: number) =>
      readLink(
        "https://example.com",
        vi.fn().mockResolvedValue(new Response("", { status: code })),
      );
    expect(await status(429)).toEqual({ ok: false, reason: "rate-limited" });
    expect(await status(403)).toEqual({ ok: false, reason: "forbidden" });
    expect(
      await readLink("https://example.com", vi.fn().mockRejectedValue(new Error("x"))),
    ).toEqual({
      ok: false,
      reason: "fetch-failed",
    });
  });

  it("treats a success with no title or company as no details", async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    expect(await readLink("https://example.com", doFetch)).toEqual({
      ok: false,
      reason: "no-details",
    });
  });
});
