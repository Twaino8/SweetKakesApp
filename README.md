# Sweet Kakes n Treats

A private business app for Sweet Kakes n Treats: orders, calendar, payments, receipts and recipes.
It installs to the home screen on her Samsung tablet and iPhone, works fully offline, and syncs the
two devices through Supabase whenever either one is online.

## How it works

- **On-device first.** Every screen reads and writes an IndexedDB database on the device (`src/lib/db.ts`).
- **Sync.** `src/lib/sync.ts` pushes changed rows and pulls newer ones. Each row carries `updated_at`
  (set by the device) and `synced_at` (set by the server); on a clash the newest edit wins.
- **Security.** Row-level security limits every table to the signed-in owner, and only emails in
  `allowed_users` can use the app at all (`supabase/migrations/0001_init.sql`).
- **Photos.** Reference photos are compressed on the device, kept offline, and uploaded to the private
  `order-photos` storage bucket.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

The recipe book is parsed from the Word file with `scripts/parse_book.py` into `src/data/recipes.json`.
