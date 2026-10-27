import { Logo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1120px] flex-col gap-6 px-4 py-16">
      <Logo className="h-10 w-auto self-start" />
      <h1 className="font-display text-4xl font-extrabold">Stepkite is being built.</h1>
      <p className="max-w-prose text-muted">
        Take-home pay calculators and CV tools for the UK, US and India. The first calculator comes
        next.
      </p>
    </main>
  );
}
