import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Controls } from "./Controls";
import { ThemeToggle } from "./ThemeToggle";
import { demo, worst } from "./fixtures";

export default async function DevGallery({ searchParams }: PageProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { data } = await searchParams;
  const isWorst = data === "worst";
  const d = isWorst ? worst : demo;

  return (
    <main className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 pb-24 pt-12">
      <h1 className="font-display text-3xl font-extrabold">Component gallery</h1>
      <Card>
        <ThemeToggle />
      </Card>
      <Card className="flex flex-wrap items-center gap-3">
        <Button>{d.button[0]}</Button>
        <Button variant="secondary">{d.button[1]}</Button>
        <Button variant="ghost">{d.button[2]}</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Saving</Button>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Input
          label={d.input.label}
          inputMode="numeric"
          defaultValue={d.input.value}
          hint={d.input.hint}
        />
        <Input
          label={d.inputError.label}
          defaultValue={d.inputError.value}
          error={d.inputError.error}
        />
      </Card>
      <Card className="flex flex-wrap gap-3">
        <Badge>{d.badges[0]}</Badge>
        <Badge tone="highlight">{d.badges[1]}</Badge>
      </Card>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-6 w-full" />
      </Card>
      <Controls data={d} />
      <nav
        aria-label="Gallery data"
        className="fixed inset-x-0 bottom-4 flex justify-center pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex rounded-full border border-border bg-surface-2 p-1 text-sm">
          <Link
            href="/dev"
            aria-current={isWorst ? undefined : "page"}
            className={`inline-flex min-h-11 items-center rounded-full px-4 ${isWorst ? "" : "bg-surface font-semibold"}`}
          >
            Demo data
          </Link>
          <Link
            href="/dev?data=worst"
            aria-current={isWorst ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 ${isWorst ? "bg-surface font-semibold" : ""}`}
          >
            Worst case
          </Link>
        </div>
      </nav>
    </main>
  );
}
