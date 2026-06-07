# Security Model

## Network OS

Network OS must use approved-user login and server-side auth enforcement in production.

Initial approved users:

- `sequoia@westpeek.ventures`
- `scooter@westpeek.ventures`

Every production API route must enforce authenticated session, approved email allowlist, role permission, and resource ownership where applicable.

## Team page

`joinwestpeek.com/team` uses a simple shared password gate: `3021WPeek`. Anything behind the Team page can be used by any user with that password.

## Secrets

Real plaintext secrets are not committed. Local/operator secrets are stored in encrypted `secrets/network-os.local.env.gpg`. Production secrets live in Cloudflare.
