import Link from "next/link";

export default function ConfirmedPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-8 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl backdrop-blur">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-white">
              Email verified!
            </h1>
            <p className="mt-2 text-sm text-emerald-50">
              Your account is ready. Log in to start building your estimate.
            </p>
          </div>
          <div className="px-8 py-6">
            <Link
              href="/login"
              className="block w-full rounded-full bg-indigo-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Log in now
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
