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
supabase/migrations/202610020002_admin_operations.sql
supabase/migrations/202610020003_game_state_api.sql
supabase/migrations/202610030004_accounts_rewards_events.sql
supabase/migrations/202610040005_admin_management.sql
supabase/migrations/202610040006_account_deletion_retention.sql
```

You can apply it with the Supabase CLI or SQL editor.

Copy `.env.example` to `.env.local` and fill:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never commit `.env.local` or a service-role key.

### Google login and changing the linked Gmail

In Google Cloud, create an OAuth Web Client for the site and configure the Google provider in Supabase Auth.

Add the exact Supabase callback URL shown by Supabase to the Google OAuth client. Also add the website URL to Supabase Auth redirect URLs.

In Supabase Auth, enable **Manual Identity Linking** before exposing the account-linking controls. The account page uses this flow deliberately: a player links another Google identity first, verifies access to it through Google, and only then can remove an older Google identity. The last remaining sign-in identity cannot be removed.

### Phone verification

The account page contains a real phone-change OTP flow, but SMS delivery requires a supported phone provider configured in Supabase Auth. Do not present phone verification as available to players until an SMS provider is configured and tested. SMS may have provider charges even when the Supabase project itself is on a free tier.

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

- `GET /api/health`
- `POST /api/game/v1/auth/register`
- `POST /api/game/v1/auth/login`
- `POST /api/game/v1/auth/refresh`
- `GET /api/game/v1/me`
- `GET /api/game/v1/state`
- `PUT /api/game/v1/state`
- `POST /api/game/v1/heartbeat`
- `POST /api/game/v1/store/purchase`
- `GET /api/game/v1/news`
- `POST /api/game/v1/internal/progress`
- `POST /api/game/v1/internal/achievements/unlock`

Do not embed `SUPABASE_SERVICE_ROLE_KEY`, `GAME_SERVER_API_KEY` or payment secrets in the game client.

Player clients may save only their own opaque save-state with a revision number. Trusted progression and achievement endpoints require `GAME_SERVER_API_KEY` and are intended for a backend game server, never a shipped client. Wallets, store prices and payment results are not writable through the player save-state endpoint.

## Zero-cost deployment target

The repository includes a Cloudflare Workers configuration using OpenNext. The Worker name is `musical-survival-official`.

A manual production workflow is available at **GitHub Actions → Deploy Cloudflare → Run workflow**. It deliberately refuses to deploy until these GitHub Actions secrets exist:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

For payment support, also add these only after real provider credentials exist:

```text
SUPABASE_SERVICE_ROLE_KEY
MOMO_PARTNER_CODE
MOMO_ACCESS_KEY
MOMO_SECRET_KEY
MOMO_ENDPOINT
MOMO_IPN_URL
MOMO_REDIRECT_URL
```

For phone verification, set `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true` only after a real SMS provider has been configured and tested in Supabase.

The deployment workflow builds and validates the app, creates a temporary secrets file only on the GitHub runner, uploads those values as encrypted Worker secrets, deploys the Worker, and deletes the temporary file. Secrets are never committed to the repository.

For local Cloudflare preview:

```bash
npm run preview
```

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


## Authentication email templates

Branded Musical Survival templates are stored in:

```text
supabase/email-templates/confirm-signup.html
supabase/email-templates/change-email.html
supabase/email-templates/reset-password.html
```

They use the SSR endpoint `/auth/confirm` and Supabase `TokenHash` verification.

New Supabase Free projects created after June 3, 2026 require a custom SMTP provider before customized authentication email templates can be used. Configure SMTP credentials in Supabase Auth; never commit them to Git.

## Unified game account

The website and game use the same Supabase Auth users and the same `profiles`, wallet and game-state records. Email/password registration requires email verification when Confirm email is enabled in Supabase. Google users are sent through player onboarding when no username exists.

## Events and rewards

Run `202610030004_accounts_rewards_events.sql` before enabling the events UI. Admins can create official events, review one submission per player, grant audited rewards and grant direct account rewards. Reward credits always pass through wallet transactions, ledger records and audit logs.


## Production migration order

Before deploying the current `main` branch to production, apply migrations in this order:

1. `202610020001_initial.sql`
2. `202610020002_admin_operations.sql`
3. `202610020003_game_state_api.sql`
4. `202610030004_accounts_rewards_events.sql`
5. `202610040005_admin_management.sql`
6. `202610040006_account_deletion_retention.sql`

The last two migrations power unified account onboarding, admin rewards, events/mini-games, player role management, search and pagination.


## Supabase setup paths

Use the SQL file that matches the target project:

- New/empty project or a project missing core tables such as `public.wallets`: run `supabase/bootstrap-production-full.sql`.
- Project that already has migrations 001-003/core tables: run `supabase/production-finalize.sql`.

Do not run the full bootstrap over a populated production database without reviewing the existing schema first.
