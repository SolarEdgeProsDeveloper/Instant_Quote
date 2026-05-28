import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOthersInService,
  getProductById,
  getRelatedAdders,
  getServiceBySlug,
} from "@/lib/google-sheets";
import CartBadge from "../../cart-badge";
import SignOutButton from "../../signout-button";
import ProductSearch from "../../product-search";
import ProductDetail from "./product-detail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ service: string; productId: string }>;
}) {
  const { service: serviceSlug, productId: rawProductId } = await params;
  const productId = decodeURIComponent(rawProductId);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [product, service, adders, others] = await Promise.all([
    getProductById(productId),
    getServiceBySlug(serviceSlug),
    getRelatedAdders(serviceSlug, productId),
    getOthersInService(serviceSlug, productId),
  ]);

  if (!product || !service) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4 sm:flex-nowrap sm:gap-4">
          <Link
            href="/quote"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Instant Quote
          </Link>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <ProductSearch />
          </div>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0 sm:gap-4">
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

      <ProductDetail
        product={product}
        service={service}
        adders={adders}
        others={others}
      />
    </main>
  );
}
