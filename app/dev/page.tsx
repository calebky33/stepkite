import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DevGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Component gallery</h1>
      <Card className="flex flex-wrap items-center gap-3">
        <Button>Calculate</Button>
        <Button variant="secondary">Compare</Button>
        <Button variant="ghost">Reset</Button>
        <Button disabled>Disabled</Button>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Input label="Annual salary" inputMode="numeric" defaultValue="28,000" hint="Before tax" />
        <Input
          label="Annual salary"
          defaultValue="abc"
          error="Enter a number, for example 28,000."
        />
      </Card>
      <Card className="flex flex-wrap gap-3">
        <Badge>2026 to 2027</Badge>
        <Badge tone="highlight">Scotland</Badge>
      </Card>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-6 w-full" />
      </Card>
    </main>
  );
}
