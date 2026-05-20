# Sweet Kakes n Treats — Project Summary

**Last Updated:** 2026-05-19
**Developer:** Claude Sonnet 4.6 (AI) + Owner

---

## What Was Built

A full mobile business management app for the **Sweet Kakes n Treats** baking business, built with:

| Technology | Purpose |
|---|---|
| React Native + Expo SDK 54 | Cross-platform iOS & Android app |
| TypeScript | Type-safe code |
| Supabase (PostgreSQL) | Cloud database backend |
| React Navigation | 7-tab bottom nav + nested stacks |
| expo-print + expo-sharing | PDF generation and sharing |
| @expo/vector-icons | All icons (MaterialCommunityIcons) |

---

## App Features Completed

| Tab | Feature | Status |
|---|---|---|
| Dashboard | Daily revenue, pending orders, low-stock alerts, quick-action buttons | Done |
| Customers | Add/manage customers, view order history | Done |
| Orders | Create & track orders, convert to invoices | Done |
| Inventory | Manage ingredients, stock levels, reorder alerts | Done |
| Reports | Daily/weekly/monthly sales, top products | Done |
| More | Invoices, Quotations, Products & Recipes, Calculator | Done |
| Settings | Business profile, labour %, markup %, tax %, currency | Done |

### Pricing Formula (built into calculator & invoices)
```
Ingredient Cost
  + Markup %     → profit on ingredients
  + Labour %     → your time/effort cost
  = Subtotal
  + Tax %        → sales tax on subtotal
  = SELLING PRICE
```

---

## Supabase Setup

- **Project Name:** `sweet-kakes-n-treats`
- **Project ID:** `jjfahgpuyujrgnfhjcrp`
- **Region:** us-east-1
- **Status:** Active & Healthy
- **URL:** `https://jjfahgpuyujrgnfhjcrp.supabase.co`
- **RLS (Row Level Security):** Disabled on all tables (single-owner private app)

### Database Tables Created (11 total)
`business_settings`, `customers`, `orders`, `order_items`, `invoices`,
`invoice_items`, `quotations`, `quotation_items`, `products`, `ingredients`, `recipe_items`

### Test Data Loaded
- 5 customers
- 12 ingredients
- 6 products
- 13 recipe items
- 5 orders
- 3 invoices

---

## Errors Encountered & Resolved

### 1. Project name with spaces
- **Error:** `create-expo-app` rejected "Sweet Kakes n Treats" as a project name
- **Fix:** Created project in `SweetKakesApp` subdirectory instead
- **Status:** Resolved

### 2. npm peer dependency conflict
- **Error:** `react-native-screens@4.25.1` requires React Native >= 0.82.0 but project has 0.81.5
- **Fix:** All installs use `--legacy-peer-deps`; pinned `react-native-screens@4.4.0`
- **Status:** Resolved

### 3. Missing babel.config.js
- **Error:** Metro bundler failed — no Babel config at root
- **Fix:** Created `babel.config.js` with `babel-preset-expo`
- **Status:** Resolved

### 4. Missing babel-preset-expo
- **Error:** `babel-preset-expo` not in devDependencies
- **Fix:** `npm install babel-preset-expo --save-dev --legacy-peer-deps`
- **Status:** Resolved

### 5. react-native-worklets missing
- **Error:** `react-native-reanimated` v4 requires `react-native-worklets`
- **Fix:** `npm install react-native-worklets --legacy-peer-deps`
- **Status:** Resolved

### 6. Hermes engine rejects PublicKeyCredential
- **Error:** Supabase auth uses a browser Web Crypto API that Hermes (Android JS engine) rejects at compile time
- **Fix:** Added global polyfill in `index.ts` AND set `"jsEngine": "jsc"` in `app.json` for Android
- **Status:** Resolved

### 7. getLowStockIngredients broken
- **Error:** Had a dead Supabase RPC call reference with no fallback
- **Fix:** Replaced with simple `supabase.from('ingredients').select('*')` + client-side filter
- **Status:** Resolved

### 8. Cross-tab navigation broken from Dashboard
- **Error:** Dashboard tried to navigate directly to `'Invoices'` but that screen is nested inside the `'More'` tab
- **Fix:** Changed to `navigation.navigate('More', { screen: 'Invoices', params: {...} })`
- **Status:** Resolved

### 9. @expo/vector-icons TypeScript error
- **Error:** Package exists in node_modules (bundled with Expo) but missing from package.json
- **Fix:** `npm install @expo/vector-icons --legacy-peer-deps`
- **Status:** Resolved

### 10. AsyncStorageError in Expo Go
- **Error:** `[AsyncStorageError: Native module is null, cannot access legacy storage]` — appeared repeatedly on every auto-refresh tick when running in Expo Go
- **Root Cause:** `@react-native-async-storage/async-storage` was passed as Supabase's auth storage, but in Expo Go the native module isn't available in the same way
- **Fix:** Removed AsyncStorage from Supabase config entirely. Since the app uses the anon key directly (no user login system), sessions don't need to persist
  ```typescript
  // Before (broken in Expo Go):
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true }

  // After (fixed):
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  ```
- **Status:** Resolved

### 11. Web export white screen
- **Error:** `npx expo export --platform web` generated files but app showed white screen in browser
- **Root Cause:** Static export had web-incompatibility issues (AsyncStorage, reanimated, etc.)
- **Fix:** N/A — user decided to focus on device testing via Expo Go instead of web browser
- **Status:** Not a priority / set aside

---

## Known Issues / Left To Fix

### 1. Web browser version shows white screen
- Running the app at `http://localhost:8081` (Expo web) shows a blank white page
- Likely caused by `react-native-reanimated` v4 or navigation libraries not fully supporting web
- **Priority:** Low — the app is intended as a mobile app; web is not required
- **To fix later:** Add web-specific shims or swap reanimated for a web-compatible alternative

### 2. App not yet published to app stores
- Currently only runs in **Expo Go** (development mode)
- To distribute properly (standalone install without Expo Go):
  ```bash
  npm install -g eas-cli
  eas login
  eas build --platform android   # Android APK/AAB
  eas build --platform ios       # iPhone (requires Mac + Apple Developer account)
  ```
- **Priority:** Medium — needed when app is ready for real business use

### 3. GitHub repository not yet pushed
- All code is committed locally (3 commits on `master` branch)
- Remote not yet connected — owner needs to:
  1. Create repo at github.com/new (name: `sweet-kakes-n-treats`, set to Private)
  2. Run:
     ```
     git remote add origin https://github.com/YOUR_USERNAME/sweet-kakes-n-treats.git
     git branch -M main
     git push -u origin main
     ```
- **Priority:** High — do this before next session

---

## File Structure

```
C:\Sweet Kakes n Treats\SweetKakesApp\
├── App.tsx                          ← Root component
├── index.ts                         ← Entry point + polyfill
├── app.json                         ← Expo config (JSC engine, branding)
├── babel.config.js                  ← Metro Babel config
├── package.json                     ← Dependencies
├── supabase_schema.sql              ← Full database schema (run in Supabase SQL editor)
├── SETUP_GUIDE.md                   ← How to set up and run the app
├── PROJECT_SUMMARY.md               ← This file
└── src/
    ├── config/
    │   └── supabase.ts              ← Supabase client (live credentials)
    ├── navigation/
    │   └── AppNavigator.tsx         ← All navigation (7 tabs + nested stacks)
    ├── screens/
    │   ├── Dashboard/
    │   ├── Customers/
    │   ├── Orders/
    │   ├── Inventory/
    │   ├── Reports/
    │   ├── Invoices/
    │   ├── Quotations/
    │   ├── Products/
    │   ├── Calculator/
    │   └── Settings/
    ├── services/                    ← Supabase data access functions
    └── utils/
        └── calculations.ts         ← Pricing formula logic
```

---

## How to Resume Tomorrow

1. Open terminal in `C:\Sweet Kakes n Treats\SweetKakesApp`
2. Run: `npx expo start`
3. Scan QR code with Expo Go on your phone
4. Continue building features or push to GitHub first (see Known Issues #3 above)
