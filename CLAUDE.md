@AGENTS.md

# Instant Quote — project context

A Next.js 16 customer-facing app for browsing home-services products,
building an estimate, and submitting it for a final quote. The catalog
is driven by a Google Sheet; auth + persistence is Supabase; emails go
out via SMTP (Nodemailer).

## Tech stack

- **Next.js 16 + App Router** (Turbopack). The `AGENTS.md` rules apply —
  it's not the Next.js you know from training data. Read
  `node_modules/next/dist/docs/` if in doubt about an API.
- **TypeScript + Tailwind CSS v4**
- **Supabase** for auth (`@supabase/ssr`), DB (Postgres + RLS),
  and Storage (file uploads).
- **Google Sheets** as the catalog source (read via service account).
- **Nodemailer** + custom SMTP for transactional emails (admin
  notifications). Resend supported as a fallback if `RESEND_API_KEY` is
  set instead of SMTP_*.
- **Hosting**: Vercel at `https://instant-quote-rho.vercel.app`

## High-level flow

```
/                  → redirects to /quote (the welcome page is removed)
/quote             → catalog: service cards + horizontal product rows  [PUBLIC]
                      (search bar in header on EVERY /quote/** page →
                       autocomplete dropdown, navigates to /quote/[service])
/quote/[service]   → product list for one service category             [PUBLIC]
/quote/[service]/[productId] → single-product detail page              [PUBLIC]
                      (image + name + price + add-to-estimate. "Related
                       products" below has two sub-sections in order:
                       1) "Adders"  → same service, subService==="adder"
                       2) "More in <Service>" → same service, every
                          other product. Both exclude the current product.)
/quote/cart        → review cart, qty controls, remove items           [PUBLIC]
                      Checkout button → centered modal w/ 2 options:
                        - Purchase & deliver  → /quote/questions
                        - Install by us        → /quote/questions (auto-submits)
/quote/questions   → questions form (or auto-submit + invoice if "install")  [AUTH]
                      Sticky-bar Submit → invoice on the same page
/quote/history     → user's submitted quotes                            [AUTH]
/quote/history/[id]→ one submitted quote with answers + notes + files   [AUTH]
/login, /signup    → auth (passes `next` query param through verification)
/auth/confirmed    → post-email-verification landing page
```

**Auth is deferred** — the cart and catalog are public. The proxy
middleware (`proxy.ts` + `lib/supabase/proxy.ts`) only gates
`/quote/questions` and `/quote/history*`. This is intentional: users
can browse and build a cart before being asked to create an account.

## Supabase setup

### Shared project — important gotcha

This app shares its Supabase project (`cwchqtgzjrhjzgrmvylo`) with
**One-Edge-Hub** (and possibly other apps in `One-Edge-CRM/apps/`).
Consequences:

- `auth.users` is **shared across all apps**. A user who signed up via
  One-Edge-Hub appears here too. Signing up with their email on
  Instant Quote silently no-ops (Supabase anti-enumeration); their
  existing password works.
- The **Site URL** in Supabase Dashboard points to One-Edge-Hub, so
  Instant Quote MUST pass an explicit `emailRedirectTo` on signup
  (it does — see `app/signup/signup-form.tsx`).
- Each app's URL must be added to **Redirect URLs** allowlist
  (Supabase Dashboard → Auth → URL Configuration). For Instant Quote:
  `http://localhost:3000/**` and `https://instant-quote-rho.vercel.app/**`.

### Schema (in `public` schema)

```sql
quotes (
  id uuid pk,
  user_id uuid fk → auth.users(id) on delete cascade,
  status text default 'draft',          -- 'draft' | 'submitted'
  products jsonb default '[]',          -- [{id,name,service,minPrice,maxPrice,imageUrl,quantity}]
  answers jsonb default '{}',           -- { "<service-slug>.<question-id>": value }
  notes jsonb default '{}',             -- { "<product-id>": "user note text" }
  total_min numeric,
  total_max numeric,
  fulfillment text,                     -- 'delivery' | 'install' | null
  created_at timestamptz,
  updated_at timestamptz,                -- auto-updated via trigger
  submitted_at timestamptz
)

-- Partial unique index: only one draft per user.
quotes_one_draft_per_user_idx on quotes(user_id) where status = 'draft'

-- RLS policies: select/insert/update/delete own only (auth.uid() = user_id)
```

```sql
notification_recipients (
  id uuid pk,
  email text unique not null,
  name text,
  enabled boolean default true,
  created_at timestamptz default now()
)

-- RLS enabled but no policies: only service_role can read/write.
-- This keeps the admin list hidden from authenticated users.
```

### Storage

- Bucket: `quote-uploads` (private)
- Path convention: `{user_id}/{file-uuid}.{ext}`
- RLS via three policies on `storage.objects`: authenticated users can
  insert/select/delete in their own user_id folder only.
- Signed URLs generated server-side via `getSignedUploadUrl()` action
  (10-minute TTL, viewed on history detail page).

### Two Supabase clients

- `lib/supabase/client.ts` — browser client (anon key, RLS enforced)
- `lib/supabase/server.ts` — server client (anon key + user cookie, RLS enforced)
- `lib/supabase/admin.ts` — **server-only** service-role client (bypasses RLS).
  Used ONLY for reading `notification_recipients`. Never import from client code.

## Google Sheets catalog

- Sheet ID: `15icsefQCXW39db3PzNqNT7Y1YUxmnG-jqEAParr5eMc` (hardcoded
  fallback; overridable via `CATALOG_SHEET_ID` env var).
- Tab: `All`. Range read: `A2:J`.
- Columns:
  - A: sheet ID (NOT unique — duplicates exist in some sections)
  - B: product name
  - C: unit (e.g. "watt" — rendered as `/watt` suffix next to per-unit prices)
  - D: service category (what we group by)
  - E: sub-service
  - F: min price (red, shown bold)
  - G: max price (no longer shown after invoice redesign — formerly strikethrough)
  - H: solar bonus (unused here, used in invoice-generator)
  - I: (unused)
  - J: product image URL
  - L..Q: free-form description fields. Row 1 of these columns holds the
    section heading (e.g. "Specifications", "Warranty"); each product
    row's L..Q cells hold the value for that section. Rendered as an
    accordion on the product detail page — empty cells show "Not
    provided." once expanded.
- Cart IDs are NOT column A. We use `r{rowNumber}-{sheetId}` because of
  duplicate column-A values in the sheet. See [lib/google-sheets.ts](lib/google-sheets.ts).
- Service hero image = first product (by sheet row order) in that
  service section, taking its column-I image.
- **Catalog cache: 5-min TTL with refresh-bypass.** `getProducts()` in
  [lib/google-sheets.ts](lib/google-sheets.ts) is wrapped in
  `unstable_cache` (tag: `"catalog"`, `revalidate: 300`). Normal link
  clicks hit the cached snapshot — fast, no Sheets API call. But the
  wrapper first checks request headers via `isBrowserRefresh()`: if
  the browser sent `Cache-Control: max-age=0` or `no-cache` (i.e. the
  user hit Cmd/Ctrl+R or the browser refresh button), we bypass the
  cache, refetch from Sheets, and fire
  `revalidateTag("catalog", { expire: 0 })` so the next normal request
  by any other user also gets the fresh snapshot instead of a stale
  one. Net effect: refresh = always fresh; never-refreshing users get
  fresh-within-5-minutes as a backstop.
- **Solar panels are a special-case**: for rows where `subService === "Panels"`,
  column C contains the panel **wattage** (a number, e.g. `445`), and
  column F is the price PER WATT (e.g. `$0.38`). [lib/google-sheets.ts](lib/google-sheets.ts)
  multiplies `minPrice`/`maxPrice` by the wattage at parse time and
  nulls out `unit`, so every downstream consumer (catalog row, cart,
  invoice total, submitted-quote total, admin email) sees the
  per-panel total. Don't restore the `/watt` display — the math
  upstream already burned the wattage in.

## Email & notifications

### Two flows:

1. **Supabase auth emails** (signup verification, password reset).
   Configured in Supabase Dashboard → Auth → SMTP Settings using the
   same SMTP creds. Required because the default Supabase SMTP is rate
   limited to ~3-4/hour.

2. **Admin notifications** (new signup, new invoice submitted). Sent
   via `lib/email.ts` (Nodemailer SMTP, with Resend HTTP fallback).
   Recipients fetched from `notification_recipients` table via the
   service-role client.

### Notification triggers

- **Signup**: `app/actions/notify.ts → notifySignupAction(email)` called
  from `signup-form.tsx` after successful `signUp()`. Fire-and-forget.
- **Invoice submitted**: inline in `submitQuote()` action. Fire-and-forget.

Both silently no-op if `notification_recipients` is empty (with a
console warning).

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | RLS-bound key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses RLS for admin reads |
| `GOOGLE_CLIENT_EMAIL` | server | Sheets service account |
| `GOOGLE_PRIVATE_KEY` | server | Sheets service account (multi-line) |
| `CATALOG_SHEET_ID` | server | Optional override for catalog sheet |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | server | Nodemailer transport |
| `EMAIL_FROM` | server | "From" address on outgoing emails |

For Vercel: add ALL of the above to Production, Preview, and
Development. Redeploy after adding (Vercel doesn't re-read env vars
without a rebuild).

## Local development

```bash
npm install
cp .env.local.example .env.local  # then fill in values
npm run dev
```

To copy env vars from the invoice-generator app:

```bash
grep -E "^(GOOGLE_|CATALOG_|SMTP_|EMAIL_FROM)=" \
  /Users/prudhveerajbotta/company_sep/One-Edge-CRM/apps/one-edge-invoice-generator/.env.local \
  >> .env.local
```

(That's how the initial wiring was done. The Supabase service-role key
is separate — get it from Supabase Dashboard → Settings → API.)

## Related apps in this monorepo workspace

- **one-edge-invoice-generator** at
  `/Users/prudhveerajbotta/company_sep/One-Edge-CRM/apps/one-edge-invoice-generator/`
  — internal CRM for processing/quoting invoices. Shares Supabase auth,
  catalog sheet, and SMTP credentials with Instant Quote. Its
  `lib/email.ts` and `lib/google-sheets.ts` were the templates for ours.

## Common gotchas (read these before changing things)

1. **Duplicate column-A values in the catalog sheet.** Each row's cart
   ID is `r{rowNumber}-{colA}`, NOT just colA. Reverting this WILL break
   per-row qty selection.

2. **localStorage versioning.** The cart key is
   `instant-quote:estimate:v4`. Bump the suffix if the shape changes.
   Answers are `instant-quote:answers:v1`, fulfillment is
   `instant-quote:fulfillment:v1`.

3. **The `next` query param** must survive: cart → /login → /signup →
   email verification → /auth/confirmed → /login → final destination.
   `app/signup/signup-form.tsx` passes it through `emailRedirectTo`,
   and `app/auth/confirmed/page.tsx` reads it back.

4. **QuoteCatalog has a write-flag pattern** (`writeFlagRef`) to prevent
   an infinite loop where its own dispatched `estimate-change` event
   would re-trigger its listener. Don't remove the flag.

5. **Submitting a quote** flips the existing draft row's status to
   `'submitted'` (it's the SAME row throughout the funnel). The
   draft → submitted transition happens once; subsequent updates (e.g.
   adding notes) update the same row's `notes` column in-place.

   **Cart localStorage is NOT cleared on submit.** Submitting saves the
   quote to the DB but leaves `instant-quote:estimate:v4`,
   `:answers:v1`, and `:fulfillment:v1` untouched so the user can keep
   browsing / revising. The cart is only cleared when the user taps
   **Pay now** on the invoice (see `clearCartForCheckout` in
   `questions-form.tsx`). The cart-badge listener (`estimate-change`
   event) keeps the header in sync. Implication: re-tapping Checkout
   from `/quote/cart` after a submit will create a NEW draft and a NEW
   submitted quote — that's intentional (the prior submission is
   already saved in history).

6. **Fulfillment = "delivery" skips questions.** `questions-form.tsx`
   reads fulfillment from localStorage on mount; if it's "delivery" it
   auto-submits with empty answers and goes straight to the invoice.
   "install" goes through the questions form to collect site details.

7. **Email confirmation is ON in Supabase.** Signup creates a user
   with `email_confirmed_at = null`; they can't log in until they
   click the verification link. EXCEPT — if their email already exists
   in `auth.users` from another app, signUp silently no-ops and they
   can log in immediately with their existing password.

8. **Pricing-notice popup on the invoice is dismiss-only via "Got it".**
   After submit, `questions-form.tsx` shows a modal asking users to add
   notes for any pricing concerns. The invoice is rendered behind it with
   a light dim (`bg-slate-900/20`, no blur) so it's visible, but the
   fixed full-screen backdrop intercepts pointer events — every feature
   underneath is disabled until the user clicks **Got it**. There is no
   backdrop-click and no ESC handler by design. Body scroll is locked
   while the popup is open. State: `pricingNoticeDismissed`.

   The **Pay now** button on the invoice opens a separate centered
   modal (`showPayOptions`) with the payment options. It's a modal —
   NOT an inline panel that replaces the button — because the invoice
   can grow long and an inline panel at the bottom of the page would
   render off-screen on tap. Both popups share the body-scroll lock
   `useEffect` keyed on `showPricingNotice || showPayOptions`.

9. **Questionnaire fees are SOLAR-ONLY today** and computed server-side
   in `submitQuote` via `computeQuestionnaireCharges`. The per-question
   charge is a deterministic djb2-hash-derived $10–$100 per answered
   question (so the same answer always yields the same fee). The set of
   fee-eligible services is `FEE_ELIGIBLE_SETS = {"solar"}` in
   `lib/questions.ts` — extend that set to enable fees for other
   services, or rip out the import + charge block in `submitQuote` /
   `notifyInvoiceSubmitted` / the history detail page when the model
   goes away.

## Things not built yet

- **Payment processing.** Pay now / Financing / Cash / Loan options on
  the invoice show a placeholder alert. Need a real provider (Stripe is
  the obvious choice).
- **Forgot password.** Users locked out of their account have no path
  back. Add `/auth/reset-password`.
- **Resend verification email.** Users whose link expired or was spam-
  filtered can't request a new one.
- **Admin dashboard.** Currently no UI to view submitted quotes
  beyond a single user's own history.
- **Error monitoring** (Sentry et al). Server errors only go to Vercel
  function logs.

## Quick command reference

```bash
# Verify build (catches type + bundling errors before deploy)
npm run build

# Type check only
npx tsc --noEmit

# Lint
npm run lint
```
