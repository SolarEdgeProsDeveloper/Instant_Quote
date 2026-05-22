# Instant Quote

A Next.js site for customers to log in and get an instant quote for home services.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Supabase (auth)

## Pages
- `/` — welcome page with a **Get a Quote** button.
- `/login` — email + password login (with link to sign up).
- `/signup` — create an account.
- `/quote` — placeholder quote questions screen (auth-protected).

Auth is enforced by `middleware.ts`: unauthenticated visitors to `/quote` are redirected to `/login`, and logged-in users on `/login` or `/signup` are sent to `/quote`.

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL + anon key:

   ```bash
   cp .env.local.example .env.local
   ```

2. Install dependencies (already done if you scaffolded with us):

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Notes
- The `/quote` page is intentionally a placeholder. Once the service list and pricing rules are finalized, the question flow + pricing logic will be wired up there.
- Email confirmation is enabled. After signing up, users must click the link in the confirmation email before they can log in.
