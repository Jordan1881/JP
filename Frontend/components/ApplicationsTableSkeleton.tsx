export function ApplicationsTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <div className="border-b border-border px-6 py-5">
        <div className="h-6 w-48 animate-pulse rounded bg-secondary/80" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-secondary/60" />
        <div className="mt-5 flex gap-3">
          <div className="h-10 w-full max-w-xs animate-pulse rounded-md bg-secondary/70 md:w-56" />
          <div className="h-10 w-36 animate-pulse rounded-md bg-secondary/60" />
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border pb-4"
            >
              <div className="h-4 flex-[2] animate-pulse rounded bg-secondary/70" />
              <div className="h-4 flex-1 animate-pulse rounded bg-secondary/60" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-secondary/60" />
              <div className="h-4 w-16 animate-pulse rounded bg-secondary/50" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
