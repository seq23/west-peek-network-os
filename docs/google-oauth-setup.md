# Google OAuth Setup

Network OS uses Google OAuth for approved app users and Gmail connection.

Initial users:

- `sequoia@westpeek.ventures`
- `scooter@westpeek.ventures`

Recommended redirect URL:

```text
https://network.joinwestpeek.com/auth/callback/google
```

Use least-privilege scopes for identity and Gmail read/search ingestion. Gmail send scope should not be added in V1 unless draft/send workflows are explicitly pulled forward.


## OAuth runtime routes

Production routes:

- /auth/google
- /auth/callback/google

Approved Google accounts authorize through /auth/google. The callback validates the Google account against ADMIN_EMAIL_ALLOWLIST, encrypts the token payload with TOKEN_ENCRYPTION_SECRET, and appends the encrypted token record to the oauth_tokens Google Sheets tab.

Required oauth_tokens tab headers:

token_id, created_at, updated_at, provider, user_email, scope, token_type, expires_in, encrypted_payload, encryption_iv, encryption_algorithm, status
