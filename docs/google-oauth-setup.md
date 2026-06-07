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
