import { CardGridSkeleton, HeroSkeleton } from "@/components/ui/skeleton";

// Instant loading state while a page streams in: a hero band and a card grid in the page's shape.
export default function Loading() {
  return (
    <>
      <HeroSkeleton />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <CardGridSkeleton />
      </div>
    </>
  );
}
