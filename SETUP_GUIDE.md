# Sweet Kakes n Treats — Setup Guide

## Prerequisites
- Node.js 18+ installed
- Expo Go app on your phone (iOS or Android) — download from App Store / Play Store
- A free Supabase account at https://supabase.com

---

## Step 1: Set Up Supabase (Cloud Database)

1. Go to https://supabase.com and sign up / log in
2. Click **"New project"** — give it a name like `sweet-kakes`
3. Wait for the project to be ready (~2 minutes)
4. In the left sidebar go to **SQL Editor**
5. Copy the entire contents of `supabase_schema.sql` and paste it in the editor, then click **Run**
6. Your database tables are now created

## Step 2: Get Your Supabase API Keys

1. In your Supabase project, go to **Settings → API**
2. Copy your **Project URL** (looks like `https://xxxx.supabase.co`)
3. Copy your **anon / public key** (the long string under "Project API keys")

## Step 3: Connect the App to Supabase

Open `src/config/supabase.ts` and replace the placeholder values:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';  // ← paste your URL
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';                   // ← paste your anon key
```

## Step 4: Run the App

```bash
cd SweetKakesApp
npm install
npx expo start
```

A QR code will appear. Scan it with:
- **Android**: Expo Go app
- **iPhone**: Camera app (it will open in Expo Go)

---

## First-Time Setup in the App

1. Open the **Settings** tab (⚙️)
2. Fill in your business name, phone, email, and address
3. Set your default **Labour %**, **Markup %**, and **Tax %**
4. Choose your currency
5. Tap **Save Settings**

Then go to **Inventory** and start adding your ingredients with their unit prices.

---

## App Features Overview

| Tab | What it does |
|-----|-------------|
| 🏠 Dashboard | Daily revenue, pending orders, low-stock alerts |
| 👥 Customers | Add/manage customers, view order history |
| 📋 Orders | Create & track orders, convert to invoices |
| 📦 Inventory | Manage ingredients, stock levels, reorder alerts |
| 📊 Reports | Daily/weekly/monthly sales, top products |
| ➕ More | Invoices, Quotations, Products & Recipes, Calculator |
| ⚙️ Settings | Business profile, pricing rates, currency |

## Pricing Calculation Logic

For every product/order, the final price is calculated as:

```
Ingredient Cost
  + Markup %       (profit on ingredients)
  + Labour %       (your time/effort cost)
  = Subtotal
  + Tax %          (sales tax on subtotal)
  = SELLING PRICE
```

All three percentages are adjustable per-invoice/quotation so you can offer different rates to different customers.

---

## Building for App Stores (Optional)

To publish to Google Play or Apple App Store, you need an Expo EAS account:

```bash
npm install -g eas-cli
eas login
eas build --platform android   # for Android APK/AAB
eas build --platform ios       # for iPhone (requires Mac/Apple Developer account)
```
