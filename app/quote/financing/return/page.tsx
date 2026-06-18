import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Customer lands here after completing the Synchrony Apply flow on
 * Synchrony's hosted page. The URL carries `ref` (applicationRefId) and
 * `q` (quoteId) query params we set when starting the application.
 *
 * The actual decision arrives via the webhook (separate request).
 * Synchrony documents the redirect as "we send the customer back; check
 * your records for the latest status." So this page reads the quote row
 * to see whatever the webhook landed and renders accordingly.
 *
 * If the webhook hasn't landed yet (race condition), we show a
 * "processing…" state that polls.
 */
export default async function FinancingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; q?: string }>;
}) {
  const { ref, q: quoteId } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/quote/financing/return?ref=${ref}&q=${quoteId}`);
  }

  type FinancingRow = {
    decisionMessage?: string;
    decisionCode?: string;
    applicationId?: string;
  };

  let financing: FinancingRow | null = null;

  if (quoteId) {
    const { data } = await supabase
      .from("quotes")
      .select("financing")
      .eq("id", quoteId)
      .eq("user_id", user.id)
      .maybeSingle();
    financing = (data?.financing as FinancingRow | null) ?? null;
  }

  const decision = financing?.decisionMessage?.toUpperCase() ?? "";
  const isApproved = decision.includes("APPROVED");
  const isDeclined =
    decision.includes("DECLINED") || decision.includes("FRAUD");
  const isPending = !financing;

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/quote"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Instant Quote
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        {isApproved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg text-white"
                aria-hidden="true"
              >
                ✓
              </span>
              <div>
                <h1 className="text-xl font-semibold text-emerald-900">
                  You&apos;re approved!
                </h1>
                <p className="mt-1 text-sm text-emerald-800">
                  Synchrony approved your financing application
                  {financing?.applicationId
                    ? ` (ref ${financing.applicationId})`
                    : ""}
                  . Continue back to your estimate to finalize the order.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={quoteId ? `/quote/history/${quoteId}` : "/quote/history"}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                View my estimate
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-rose-900">
              Application not approved
            </h1>
            <p className="mt-1 text-sm text-rose-800">
              Synchrony was unable to approve your financing application this
              time. You can still pay another way or contact us to discuss
              alternatives.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={quoteId ? `/quote/history/${quoteId}` : "/quote/history"}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                Back to my estimate
              </Link>
            </div>
          </div>
        )}

        {!isApproved && !isDeclined && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              {isPending
                ? "Confirming your application…"
                : "Application received"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              We&apos;re waiting on the final decision from Synchrony. This
              page will update automatically — refresh if you don&apos;t see
              your status within a minute.
            </p>
            {/* Lightweight client-side poll — refreshes the page once every 5s. */}
            <meta httpEquiv="refresh" content="5" />
          </div>
        )}
      </section>
    </main>
  );
}
