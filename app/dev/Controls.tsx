"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { useCountTween } from "@/components/ui/useCountTween";
import type { GalleryData } from "./fixtures";

type Period = "year" | "month" | "week";

function ToastButtons({ data }: { data: GalleryData["controls"] }) {
  const { toast } = useToast();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => toast({ title: data.toastTitle, description: data.toastBody })}
      >
        Show a toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ title: data.toastTitle, tone: "error", duration: 8000 })}
      >
        Show an error toast
      </Button>
    </>
  );
}

function Pair({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

export function Controls({ data }: { data: GalleryData }) {
  const c = data.controls;
  const [salary, setSalary] = useState<number | null>(28000);
  const [slide, setSlide] = useState(28000);
  const [period, setPeriod] = useState<Period>("year");
  const [dialogOpen, setDialogOpen] = useState(false);
  const tween = useCountTween(slide);

  const regionOptions = c.regions.map((r, i) => ({ value: String(i), label: r }));
  const periodOptions: Array<{ value: Period; label: string }> = [
    { value: "year", label: "Year" },
    { value: "month", label: "Month" },
    { value: "week", label: "Week" },
  ];

  return (
    <ToastProvider>
      <Pair title="Icon button">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label="Add a job" icon={<Plus size={20} />} />
          <IconButton label="Add a job" icon={<Plus size={20} />} variant="secondary" />
          <IconButton label="Add a job" icon={<Plus size={20} />} variant="primary" />
          <IconButton label="Add a job" icon={<Plus size={20} />} disabled />
          <IconButton label="Adding a job" icon={<Plus size={20} />} loading />
          <Tooltip content={c.tooltip}>
            <IconButton label="Move up" icon={<Plus size={20} />} variant="secondary" />
          </Tooltip>
        </div>
      </Pair>

      <Pair title="Currency input">
        <div className="grid gap-4 sm:grid-cols-2">
          <CurrencyInput
            label={`${c.sliderLabel} in rupees`}
            hint="Grouped in lakhs."
            locale="en-IN"
            currency="INR"
            value={salary}
            onValueChange={setSalary}
          />
          <CurrencyInput
            label="Annual salary in pounds"
            locale="en-GB"
            currency="GBP"
            defaultValue={28000}
          />
          <CurrencyInput
            label="Annual salary in dollars"
            locale="en-US"
            currency="USD"
            maxFractionDigits={2}
            defaultValue={52000.5}
          />
          <CurrencyInput
            label="Annual salary"
            locale="en-GB"
            currency="GBP"
            defaultValue={28000000000}
            error="Enter a salary between £1 and £10,000,000."
          />
          <CurrencyInput
            label="Annual salary, locked"
            locale="en-GB"
            currency="GBP"
            defaultValue={28000}
            disabled
          />
        </div>
      </Pair>

      <Pair title="Select">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={c.selectLabel}
            hint="Pick the closest match."
            options={regionOptions}
            defaultValue="0"
          />
          <Select label="Region" options={regionOptions} error="Choose a region." />
          <Select label="Region, locked" options={regionOptions} defaultValue="1" disabled />
        </div>
      </Pair>

      <Pair title="Segmented control">
        <SegmentedControl<Period>
          label={c.segmentLabel}
          hint="Changes how figures are shown."
          options={periodOptions}
          value={period}
          onValueChange={setPeriod}
        />
        <SegmentedControl<Period>
          label="Pay period, locked"
          options={periodOptions}
          defaultValue="month"
          disabled
        />
        <SegmentedControl<Period>
          label="Pay period"
          options={periodOptions}
          error="Choose how often you are paid."
        />
      </Pair>

      <Pair title="Slider with count tween">
        <p aria-live="polite" className="font-display text-4xl font-extrabold tabular-nums">
          {Math.round(tween).toLocaleString("en-GB")}
        </p>
        <Slider
          label={c.sliderLabel}
          hint="Drag or use the arrow keys."
          min={0}
          max={200000}
          step={500}
          value={slide}
          onValueChange={setSlide}
          valueText={`${slide} pounds`}
        />
        <Slider label="Annual salary, locked" min={0} max={100} defaultValue={40} disabled />
      </Pair>

      <Pair title="Switch">
        <Switch label={c.switchLabel} hint={c.switchHint} />
        <Switch label={c.switchLabel} defaultChecked />
        <Switch label="Student loan" disabled />
        <Switch label="Student loan" error="Choose one before you continue." />
      </Pair>

      <Pair title="Tabs">
        <Tabs
          label="Result views"
          tabs={[
            { value: "a", label: c.tabs[0], content: <p>Your take-home pay is shown here.</p> },
            { value: "b", label: c.tabs[1], content: <p>Each tax band is shown here.</p> },
          ]}
        />
      </Pair>

      <Pair title="Dialog, sheet and toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Sheet
            trigger={<Button variant="secondary">Open sheet</Button>}
            title={c.dialogTitle}
            description={c.dialogBody}
            footer={<Button>Done</Button>}
          />
          <ToastButtons data={c} />
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={c.dialogTitle}
          description={c.dialogBody}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Keep my figures
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Reset</Button>
            </>
          }
        />
      </Pair>

      <Pair title="Table">
        <Table label="Tax breakdown">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Item</TableHeaderCell>
              <TableHeaderCell numeric>Per year</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {c.rows.map(([name, amount], index) => (
              <TableRow key={name} selected={index === 2}>
                <TableCell>{name}</TableCell>
                <TableCell numeric>{amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Pair>

      <Pair title="Progress steps">
        <ProgressSteps label="Build your CV" steps={c.steps} current={1} />
        <ProgressSteps label="Build your CV, first step" steps={c.steps.slice(0, 1)} current={0} />
      </Pair>
    </ToastProvider>
  );
}
