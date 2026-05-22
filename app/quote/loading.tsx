export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200" />
            <div className="hidden h-4 w-32 rounded bg-slate-200 sm:block" />
            <div className="h-4 w-16 rounded bg-slate-200" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 pb-32">
        <div className="max-w-2xl animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-10 w-3/4 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full rounded bg-slate-200" />
          <div className="mt-1 h-4 w-2/3 rounded bg-slate-200" />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] animate-pulse bg-slate-200" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-9 w-full animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
