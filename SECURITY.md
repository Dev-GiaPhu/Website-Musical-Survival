# Security Policy

## Supported branch

Security fixes are applied to the `main` branch.

## Sensitive information

Never commit or post any of the following in source code, issues, pull requests, screenshots, or logs:

- Supabase service-role keys
- Google OAuth client secrets
- MoMo access or secret keys
- Cloudflare API tokens
- SMS provider credentials
- Production environment files

The repository ignores local environment files, Cloudflare temporary files and generated deployment secret files.

## Reporting a vulnerability

Do not publish exploitable security details or credentials in a public issue.

Use GitHub private vulnerability reporting / Security Advisories for this repository when available. Include the affected route or feature, reproduction steps, expected behavior and observed behavior. Do not include real player credentials or payment secrets.

## Account and economy rules

Wallet balances and item prices are server-authoritative. Client applications must never be trusted to submit a final balance, authoritative price, administrator role or payment-success decision.

Payment credit is granted only after a verified provider callback and a database transaction completes successfully.
