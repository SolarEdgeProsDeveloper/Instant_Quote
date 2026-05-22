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

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-300 to-slate-400">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="h-4 w-24 animate-pulse rounded bg-white/40" />
          <div className="mt-4 flex items-center gap-4">
            <div className="h-14 w-14 animate-pulse rounded-full bg-white/30" />
            <div>
              <div className="h-3 w-16 animate-pulse rounded bg-white/40" />
              <div className="mt-2 h-9 w-64 animate-pulse rounded bg-white/40" />
            </div>
          </div>
          <div className="mt-5 h-4 w-2/3 max-w-xl animate-pulse rounded bg-white/40" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 pb-32">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-1 h-4 w-40 animate-pulse rounded bg-slate-200" />

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 flex items-baseline gap-2">
                <div className="h-6 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="mt-5 h-10 w-full animate-pulse rounded-full bg-slate-200" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
