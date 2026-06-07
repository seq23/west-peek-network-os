# West Peek Network OS

Private internal relationship intelligence app for adding people to the **West Peek Network**.

## Locked identity

- Repo: `west-peek-network-os`
- App URL: `https://network.joinwestpeek.com`
- Internal Team launchpad: `https://joinwestpeek.com/team`
- Team password: `3021WPeek`
- Team tools: Network OS and Venture Deals Calculator
- Venture Deals Calculator URL: `https://venturedeals.joinwestpeek.com`
- Public venture nav tool: `https://dilution.joinwestpeek.com`
- Initial users: `sequoia@westpeek.ventures`, `scooter@westpeek.ventures`

## Product language

Use **Add to West Peek Network**. Avoid front-facing language like “add to CRM,” “add to database,” or “add lead.”

## Canonical Gmail trigger

Primary trigger: `#wpnetwork`

Accepted aliases:

- `#addtowestpeek`
- `#westpeeknetwork`

Trigger emails create Intake Queue records first. They do not create final contacts until human review.

## Local operator flow

```bash
./scripts/secrets/decrypt-local-env.sh
./scripts/secrets/check-secrets.sh
npm run dev
```

The locked secrets password is `3021WPeek`, but the password is not embedded in repo scripts.

## Cloudflare secret push

```bash
./scripts/secrets/decrypt-local-env.sh
./scripts/secrets/check-secrets.sh
./scripts/secrets/push-cloudflare-secrets.sh
```

One-time manual steps still include Wrangler login, Pages project/repo connection if missing, custom domain setup, and Google OAuth redirect URL configuration.

## Validation

```bash
npm run validate:all
NODE_OPTIONS="--max-old-space-size=3072" npm run build 2>&1 | tee logs/build.log
npm run test:e2e
```

This baseline artifact is structurally checked by default. External provider execution requires configured secrets and provider setup.
