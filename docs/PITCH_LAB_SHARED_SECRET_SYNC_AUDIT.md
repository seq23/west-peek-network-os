# Pitch Lab Shared Secret Sync Audit

Date: 2026-06-10
Repo: west-peek-network-os-main
Source ZIP: west-peek-network-os-main_BASELINE_06-09-26_0000002.zip
Scope: Sync Network OS receiver secret to match Pitch Lab sender secret.

## Result

The Network OS encrypted local secret bundle now includes `PITCH_LAB_SHARED_SECRET`.

The value was copied from Pitch Lab `NETWORK_OS_SHARED_SECRET` and re-encrypted without printing or committing the plaintext value.

## Files updated

- `secrets/network-os.local.env.gpg`
- `scripts/secrets/required-keys.txt`
- `docs/PITCH_LAB_SHARED_SECRET_SYNC_AUDIT.md`
- `ENVIRONMENT_VARIABLES.md`
- `ARTIFACT_MANIFEST.md`
- `.npmrc`

## Security handling

- Plaintext `.env.local` was created only as a temporary working file.
- Plaintext `.env.local` was deleted before packaging.
- The shared secret value was not written to docs, logs, source files, or examples.
- Only secret names and masked/presence-level validation are documented.

## Receiver contract

Network OS expects Pitch Lab handoff requests to be signed with:

- `x-pitch-lab-submitted-at`
- `x-pitch-lab-signature`
- HMAC-SHA256 over `${submittedAt}.${rawBody}`
- receiver key: `PITCH_LAB_SHARED_SECRET`

Pitch Lab sender key must remain `NETWORK_OS_SHARED_SECRET`.

## Validation performed

- `scripts/secrets/check-secrets.sh` passed during re-encryption.
- `npm run validate:all` passed.
- `npm run build` passed after dependency install.
- Reopened ZIP validation must be run after packaging.

## Unproven layers

- Live Cloudflare secret presence is not proven until this repo is deployed or the Cloudflare secret push is run locally.
- Live Pitch Lab to Network OS browser/API handoff is not proven until both apps are deployed with matching production secrets.
