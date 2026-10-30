"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Slider } from "@/components/shadcn/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Donut } from "@/components/tools/PayCalculator/Donut";
import { buildOptions, DEFAULT_VALUES } from "@/components/tools/PayCalculator/options";
import { slicesFor } from "@/components/tools/PayCalculator/ResultCard";
import { useEngine } from "@/components/tools/PayCalculator/useEngine";
import { formatMoney } from "@/lib/countries";
import { getRates } from "@/lib/tax";
import { MAX_GROSS, MIN_GROSS, type PayResult } from "@/lib/tax/types";

type DashboardTab = "pay" | "cv";

type CvDraft = { fullName: string; title: string; summary: string };

type PayView =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; result: PayResult };

const SALARY_MIN = 10_000;
const SALARY_MAX = 150_000;
const SALARY_STEP = 500;

const EMPTY_CV: CvDraft = { fullName: "", title: "", summary: "" };

function isTab(value: unknown): value is DashboardTab {
  return value === "pay" || value === "cv";
}

function firstNumber(value: number | readonly number[]): number {
  return typeof value === "number" ? value : (value[0] ?? SALARY_MIN);
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function StepkiteDashboard() {
  const [tab, setTab] = useState<DashboardTab>("pay");
  const [gross, setGross] = useState<number>(45_000);
  const [pension, setPension] = useState<string>("");
  const [cv, setCv] = useState<CvDraft>(EMPTY_CV);
  const [active, setActive] = useState<string | null>(null);
  const engineState = useEngine("uk");
  const engine = engineState.status === "ready" ? engineState.engine : null;
  const engineFailed = engineState.status === "failed";

  const view: PayView = useMemo(() => {
    if (engineFailed) return { kind: "error" };
    if (!engine) return { kind: "loading" };
    if (gross < MIN_GROSS || gross > MAX_GROSS) {
      return { kind: "invalid", message: "Enter a salary the calculator can work with." };
    }
    const built = buildOptions("uk", { ...DEFAULT_VALUES.uk, pensionPercent: pension });
    const message = Object.values(built.errors)[0];
    if (message) return { kind: "invalid", message };
    try {
      const outcome = engine({
        country: "uk",
        taxYear: getRates("uk").taxYear,
        gross,
        period: "year",
        region: built.region,
        options: built.options,
      });
      return outcome.status === "ready"
        ? { kind: "ready", result: outcome.result }
        : { kind: "error" };
    } catch {
      return { kind: "error" };
    }
  }, [engine, engineFailed, gross, pension]);

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        if (isTab(next)) setTab(next);
      }}
      className="w-full gap-6"
    >
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Your workspace</h2>
          <p className="text-sm text-muted-foreground">
            Change a figure and the preview updates straight away.
          </p>
        </div>
        <TabsList className="w-full sm:w-80">
          <TabsTrigger value="pay">Take-home pay</TabsTrigger>
          <TabsTrigger value="cv">CV</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full lg:w-2/5">
          <TabsContent value="pay">
            <Card>
              <CardHeader>
                <CardTitle>Your pay</CardTitle>
                <CardDescription>England, current tax year.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Salary before tax</span>
                    <span className="font-semibold tabular-nums">{formatMoney(gross, "uk")}</span>
                  </div>
                  <Slider
                    aria-label="Salary before tax"
                    min={SALARY_MIN}
                    max={SALARY_MAX}
                    step={SALARY_STEP}
                    value={[gross]}
                    onValueChange={(next) => setGross(firstNumber(next))}
                  />
                </div>
                <Field id="pension" label="Pension contribution, percent of salary">
                  <Input
                    id="pension"
                    inputMode="decimal"
                    placeholder="0"
                    value={pension}
                    onChange={(event) => setPension(event.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="cv">
            <Card>
              <CardHeader>
                <CardTitle>Your details</CardTitle>
                <CardDescription>Stays in this browser.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field id="full-name" label="Full name">
                  <Input
                    id="full-name"
                    autoComplete="name"
                    maxLength={80}
                    value={cv.fullName}
                    onChange={(event) => setCv({ ...cv, fullName: event.target.value })}
                  />
                </Field>
                <Field id="job-title" label="Job title">
                  <Input
                    id="job-title"
                    maxLength={80}
                    value={cv.title}
                    onChange={(event) => setCv({ ...cv, title: event.target.value })}
                  />
                </Field>
                <Field id="summary" label="Short summary">
                  <Input
                    id="summary"
                    maxLength={300}
                    value={cv.summary}
                    onChange={(event) => setCv({ ...cv, summary: event.target.value })}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>
        </div>

        <div className="w-full min-w-0 lg:sticky lg:top-[calc(var(--header-h,0px)+1.5rem)] lg:w-3/5">
          {tab === "pay" ? (
            <PayPreview view={view} active={active} onActive={setActive} />
          ) : (
            <CvPreview cv={cv} />
          )}
        </div>
      </div>
    </Tabs>
  );
}

function PayPreview({
  view,
  active,
  onActive,
}: {
  view: PayView;
  active: string | null;
  onActive: (key: string | null) => void;
}) {
  if (view.kind === "loading") {
    return <p className="p-6 text-sm text-muted-foreground">Loading the calculator.</p>;
  }
  if (view.kind === "error") {
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        We could not work out your pay. Reload the page and try again.
      </p>
    );
  }
  if (view.kind === "invalid") {
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        {view.message}
      </p>
    );
  }
  const { result } = view;
  const slices = slicesFor(result);
  return (
    <Card>
      <CardHeader>
        <CardTitle>You take home {formatMoney(result.perPeriod.month, "uk")} a month</CardTitle>
        <CardDescription>{formatMoney(result.net, "uk")} a year after deductions.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 sm:items-center">
        <div className="mx-auto w-full max-w-60">
          <Donut
            slices={slices}
            activeKey={active}
            onActiveChange={onActive}
            label="Where your salary goes"
          />
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.key} className="flex justify-between gap-4">
              <span>{slice.label}</span>
              <span className="tabular-nums">{formatMoney(slice.value, "uk")}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CvPreview({ cv }: { cv: CvDraft }) {
  const empty = cv.fullName === "" && cv.title === "" && cv.summary === "";
  return (
    <Card className="min-h-96">
      <CardContent className="flex flex-col gap-3 break-words">
        {empty ? (
          <p className="text-sm text-muted-foreground">Start typing and your CV appears here.</p>
        ) : (
          <>
            <h3 className="text-2xl font-semibold">{cv.fullName}</h3>
            <p className="text-base text-muted-foreground">{cv.title}</p>
            <p className="text-sm leading-relaxed">{cv.summary}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
