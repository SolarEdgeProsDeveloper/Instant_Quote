import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getProductsForService,
  getServiceBySlug,
} from "@/lib/google-sheets";
import CartBadge from "../cart-badge";
import SignOutButton from "../signout-button";
import ProductList from "./product-list";

export default async function ServiceProductsPage({
  params,
}: {
  params: Promise<{ service: string }>;
}) {
  const { service: slug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const products = await getProductsForService(slug);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/quote"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Instant Quote
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <Link
                href="/quote/history"
                className="hidden text-sm font-medium text-indigo-600 hover:text-indigo-500 sm:block"
              >
                My quotes
              </Link>
            )}
            <CartBadge />
            {user ? (
              <>
                <p className="hidden text-sm text-slate-600 sm:block">
                  {user.email}
                </p>
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <ProductList service={service} products={products} />
    </main>
  );
}
