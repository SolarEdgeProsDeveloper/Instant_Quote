export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="hidden h-4 w-32 rounded bg-slate-200 sm:block" />
            <div className="h-4 w-16 rounded bg-slate-200" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />

        <div className="mt-8 space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="h-28 animate-pulse bg-gradient-to-br from-slate-300 to-slate-400" />
              <div className="space-y-6 px-6 py-8 sm:px-8">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
                <div className="h-20 w-full animate-pulse rounded-lg bg-slate-200" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div
                      key={j}
                      className="h-9 w-24 animate-pulse rounded-full bg-slate-200"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
