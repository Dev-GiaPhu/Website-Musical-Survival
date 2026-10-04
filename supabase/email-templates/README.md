# Musical Survival authentication email templates

These templates are intended for Supabase Auth:

- `confirm-signup.html` → Confirm sign up
- `change-email.html` → Change email address
- `reset-password.html` → Reset password

Recommended subjects:

- Confirm sign up: `Xác minh tài khoản Musical Survival`
- Change email address: `Xác nhận thay đổi email Musical Survival`
- Reset password: `Khôi phục tài khoản Musical Survival`

The templates deliberately use `{{ .RedirectTo }}` and `{{ .TokenHash }}` so the Next.js SSR endpoint at `/auth/confirm` can verify the token and create/update the browser session.

Do not replace the token-hash URL with a client-side hash flow.

For new Supabase Free projects created after June 3, 2026, custom auth email templates require a custom SMTP provider. Do not place SMTP passwords in this repository.


Security notification templates:

- `password-changed.html` → Password changed notification
- `email-changed.html` → Email address changed notification
- `identity-linked.html` → Sign-in method linked notification
- `identity-unlinked.html` → Sign-in method removed notification

Enable the corresponding security notifications in Supabase Auth before expecting these messages to be sent.
