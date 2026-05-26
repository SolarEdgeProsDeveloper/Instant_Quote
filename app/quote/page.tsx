import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getProducts,
  getServices,
  type Product,
  type ServiceItem,
} from "@/lib/google-sheets";
import CartBadge from "./cart-badge";
import SignOutButton from "./signout-button";
import QuoteCatalog from "./quote-catalog";

export default async function QuotePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/quote");
  }

  let services: ServiceItem[] = [];
  let products: Product[] = [];
  let fetchError: string | null = null;
  try {
    [services, products] = await Promise.all([getServices(), getProducts()]);
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : "Failed to load catalog.";
    console.error("[/quote] catalog fetch failed:", err);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            Instant Quote
          </p>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/quote/history"
              className="hidden text-sm font-medium text-indigo-600 hover:text-indigo-500 sm:block"
            >
              My quotes
            </Link>
            <CartBadge />
            <p className="hidden text-sm text-slate-600 sm:block">
              {user.email}
            </p>
            <SignOutButton />
          </div>
        </div>
      </header>

      {fetchError ? (
        <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load the catalog from the sheet. {fetchError}
          </div>
        </section>
      ) : (
        <QuoteCatalog services={services} products={products} />
      )}
    </main>
  );
}
