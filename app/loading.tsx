import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading the page"
      className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-8 md:px-6 md:py-12"
    >
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-6 w-full max-w-prose" />
      <Skeleton className="mt-4 h-80 w-full" />
    </div>
  );
}
