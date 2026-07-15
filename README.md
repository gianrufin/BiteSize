# BiteSize

Scan a receipt, share a QR code, and let everyone claim what they ordered —
BiteSize splits the bill automatically.

## Setup

1. Install dependencies: `npm install`
2. Create a [Supabase](https://supabase.com) project.
3. Run the SQL in `supabase/migrations/0001_init.sql` against it (SQL editor, or
   the Supabase CLI).
4. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's
   URL, anon key, and service role key (Project Settings → API).
5. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres, Realtime,
Storage), Tesseract.js for OCR. See the plan doc for the full rationale.
