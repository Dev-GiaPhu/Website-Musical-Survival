# Musical Survival — Production Finalization

This file is the final external-configuration checklist for the current `main` branch.
Code changes should not be required when these steps are performed.

## 1. Database

The project already has migrations 001-003 applied in production.

Apply, in order:

1. `supabase/migrations/202610030004_accounts_rewards_events.sql`
2. `supabase/migrations/202610040005_admin_management.sql`
3. `supabase/migrations/202610040006_account_deletion_retention.sql`

Do not skip any migration. Migration 006 is required for permanent account deletion while retaining non-linked financial/audit records needed for integrity and reconciliation.

## 2. Supabase Auth URLs

Production site:

`https://musical-survival-official.robloxphu113.workers.dev`

Set the Supabase Auth Site URL to the production site.

Allow the production origin / auth callbacks in Redirect URLs. Keep localhost entries only when local development is still needed.

Confirm Email must remain enabled so email/password registrations require verification.

Secure Email Change should remain enabled so changing an email requires the configured confirmation flow.

## 3. Supabase authentication email templates

Repository templates:

- Confirm sign up: `supabase/email-templates/confirm-signup.html`
- Change email address: `supabase/email-templates/change-email.html`
- Reset password: `supabase/email-templates/reset-password.html`
- Password changed notification: `supabase/email-templates/password-changed.html`
- Email changed notification: `supabase/email-templates/email-changed.html`
- Sign-in method linked notification: `supabase/email-templates/identity-linked.html`
- Sign-in method removed notification: `supabase/email-templates/identity-unlinked.html`

Use custom SMTP for the branded production emails. Do not commit SMTP credentials.

Disable email-link tracking in the SMTP provider if it rewrites authentication links.

## 4. Google OAuth

In Google Cloud, add the production website origin:

`https://musical-survival-official.robloxphu113.workers.dev`

The OAuth redirect URI remains the Supabase callback URL for the project:

`https://<project-ref>.supabase.co/auth/v1/callback`

Do not replace the Supabase redirect URI with the Worker URL.

## 5. GitHub Actions / Worker environment

Required deployment secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended for initial publisher setup:

- `BOOTSTRAP_ADMIN_EMAIL`

Optional features:

- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED`
- `GAME_SERVER_API_KEY`
- `MOMO_PARTNER_CODE`
- `MOMO_ACCESS_KEY`
- `MOMO_SECRET_KEY`
- `MOMO_ENDPOINT`
- `MOMO_IPN_URL`
- `MOMO_REDIRECT_URL`

Payment secrets must only be added when a real merchant environment is available.

## 6. Initial Super Admin

After the configured `BOOTSTRAP_ADMIN_EMAIL` has registered, verified its email and logged in, open:

`/admin/bootstrap`

Activate the first Super Admin.

After a Super Admin exists, additional player/admin roles can be managed from Publisher Console.

## 7. Deploy

GitHub → Actions → Deploy Cloudflare → Run workflow on `main`.

The workflow rejects production deployment from any branch other than `main`.

After deployment it smoke-tests:

- homepage
- login page
- news
- events
- store
- health API

A failed smoke test means the production deployment must not be treated as healthy.

## 8. Production acceptance test

Test with a fresh player account:

1. Register with email/password.
2. Receive branded verification email and confirm.
3. Log in.
4. Confirm the homepage and header recognize the signed-in account.
5. Open account and verify Player ID, wallet, game progress, inventory and achievements.
6. Change display name and username.
7. Link Google and test Google login.
8. Request email change and complete all confirmations.
9. Change password and verify other sessions are invalidated.
10. Download account-data export.
11. Test event submission.
12. Test store purchase only with a real configured item and sufficient balance.
13. If payments are enabled, test a real provider sandbox/production flow and verify credit is only granted after a valid IPN.
14. Verify Admin: news, announcements, players, roles, rewards, transactions, game catalog, events, audit logs and security events.
15. Verify account deletion only with a disposable test account.

## 9. Game client integration

The game should use the Worker API, not service-role credentials.

Available API groups include:

- `/api/game/v1/auth/*`
- `/api/game/v1/me`
- `/api/game/v1/state`
- `/api/game/v1/heartbeat`
- `/api/game/v1/news`
- `/api/game/v1/announcements`
- `/api/game/v1/events`
- `/api/game/v1/store`
- `/api/game/v1/store/purchase`
- `/api/game/v1/config`

Trusted server-only endpoints under `/api/game/v1/internal/*` require `GAME_SERVER_API_KEY` and the key must never be embedded in a shipped game client.
