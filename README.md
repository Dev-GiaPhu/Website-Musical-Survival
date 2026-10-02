# Musical Survival Official Website

Official website, account service and game-facing API for **Musical Survival**.

## Current scope

- Next.js website with the browser title **Musical Survival Official**
- Google sign-in through Supabase Auth
- Player profile, username history, email change and phone-link flow
- Presence / last-seen state
- Server-authoritative wallet and immutable wallet ledger
- MoMo payment order + verified IPN flow
- News publishing area for authorized publisher accounts
- Achievements, player game state, inventory and store schema
- Bearer-token game API
- Row Level Security and audit/security tables
- GitHub Actions validation

No game facts, release dates, prices, social links or download links are seeded by this repository. They must be added only when they are official.

## Cost-conscious setup

The project is designed so development can start with free tiers:

- GitHub repository
- Supabase free project for PostgreSQL + Auth
- A free hosting tier that supports Next.js server routes

A production payment gateway and phone SMS verification require accounts with their respective providers and may have transaction/SMS fees. The repository does not pretend those external services are free or active without credentials.

## 1. Supabase

Create a Supabase project and run:

```text
supabase/migrations/202610020001_initial.sql
```

You can apply it with the Supabase CLI or SQL editor.

Copy `.env.example` to `.env.local` and fill:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never commit `.env.local` or a service-role key.

### Google login

In Google Cloud, create an OAuth Web Client for the site and configure the Google provider in Supabase Auth.

Add the exact Supabase callback URL shown by Supabase to the Google OAuth client. Also add the website URL to Supabase Auth redirect URLs.

## 2. First administrator

New accounts always start as `player`. Do not let a browser choose its own role.

After signing in once, promote the intended publisher account in the Supabase SQL editor:

```sql
update public.profiles
set role = 'super_admin'
where id = '<AUTH_USER_UUID>';
```

The publisher area is available at `/admin`.

## 3. MoMo

The payment code follows MoMo's server-to-server IPN model. Do not enable top-up packages until a real merchant/test account is configured.

Set:

```text
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_IPN_URL=https://YOUR_DOMAIN/api/payments/momo/ipn
MOMO_REDIRECT_URL=https://YOUR_DOMAIN/top-up/result
```

The redirect page never credits coins. Coins are credited only after a valid signed IPN is processed and `finalize_payment_order` succeeds.

## 4. Add top-up packages

No fake packages are seeded. Add only approved packages:

```sql
insert into public.topup_packages(code, name, vnd_amount, coin_amount, active, sort_order)
values ('example-code', 'Official package name', 10000, 100, false, 10);
```

Keep `active = false` until the package and payment account are ready.

## 5. Add game store items

Game clients submit only a SKU. They never submit the authoritative price or a new balance.

```sql
insert into public.store_items(sku, name, price_coins, active)
values ('official-sku', 'Official item name', 500, false);
```

Enable an item only after its game data is official.

## Game API

Authenticated requests use:

```text
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

Current endpoints:

- `GET /api/game/v1/me`
- `POST /api/game/v1/heartbeat`
- `POST /api/game/v1/store/purchase`
- `GET /api/game/v1/news`

Do not embed `SUPABASE_SERVICE_ROLE_KEY` or payment secrets in the game client.

## Local development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run typecheck
npm run lint
npm run build
```

## Repository visibility

This code contains no committed secrets and can safely be developed in a public repository when environment variables are kept outside Git. For an unreleased commercial project, changing the repository to Private is still recommended when your GitHub plan supports it.
