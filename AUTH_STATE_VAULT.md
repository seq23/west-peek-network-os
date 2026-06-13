# Authenticated Browser-State Vault

Status: ACTIVE

## Purpose

Preserve the Google-authenticated Playwright storage state outside the repository so snapshot ZIP updates may safely delete `.auth/` without destroying the canonical session backup.

## Canonical locations

- Encrypted external vault: `~/AI_AUTH_VAULTS/west-peek-network-os/playwright-storage-state.json.gpg`
- Disposable repo-local state: `.auth/playwright-storage-state.json`

Both paths may be overridden with `AUTH_STATE_VAULT_PATH` and `AUTH_STATE_LOCAL_PATH`. The production cookie-domain validator defaults to `network.joinwestpeek.com` and may be overridden with `AUTH_STATE_EXPECTED_DOMAIN` only when the canonical production domain intentionally changes.

## Commands

- `npm run auth:capture` — open the deployed app in Playwright, complete Google authentication once, validate the resulting `wpn_session`, and atomically install `.auth/playwright-storage-state.json`. It refuses to overwrite an existing local state unless `AUTH_CAPTURE_OVERWRITE=1` is set intentionally.
- `npm run auth:status` — report whether the vault/local state exists and validate the local state without printing cookie values.
- `npm run auth:backup` — encrypt the current repo-local authenticated state into the external canonical vault.
- `npm run auth:restore` — decrypt and atomically restore the repo-local state with mode `0600`.
- `npm run auth:remove-local` — remove only the disposable local state while preserving the encrypted vault.
- `npm run tier4:authenticated` — restore when needed, export the storage-state variables, print a non-secret provider-input preflight, and launch Tier 4. Authentication alone does not replace Gmail seed messages, live-lane flags, Google Sheets enablement, Pitch Lab secret availability, or AI/OCR/voice mode selection.
- `npm run hallmark:authenticated` — restore when needed and run the Hallmark evidence collector against the deployed app.

## Initial capture

Run `npm run auth:capture`. Complete Google sign-in in the Playwright browser, wait for the authenticated dashboard, and close the browser. Then run `npm run auth:backup` to create the external encrypted canonical copy.

The capture command defaults to `https://network.joinwestpeek.com`. Override only with an explicit deployed HTTPS URL using `AUTH_CAPTURE_URL`.

## Security laws

- `.auth/` remains gitignored.
- The encrypted vault is outside the repo and outside baseline ZIPs.
- Cookie values, session tokens, passphrases, and decrypted JSON are never printed or passed in process arguments.
- Restore validates JSON shape, a non-empty `wpn_session`, production domain scope, and expiry before installing the file.
- Backup and restore use temporary files and atomic replacement.
- The external vault directory is mode `0700`; encrypted and restored files are mode `0600`.
- A missing or expired session blocks authenticated Tier 4 and Hallmark execution rather than silently falling back.

## Hallmark

`npm run hallmark:authenticated` uses the same restored authenticated state as Tier 4 and invokes:

`~/run_hallmark_audit.sh <repo> --base-url <url> --storage-state .auth/playwright-storage-state.json`

Default URL: `https://network.joinwestpeek.com`.
Override with `HALLMARK_BASE_URL`.
Additional Hallmark runner arguments may be appended after `--`, for example targeted `--route` options. The wrapper blocks if the installed Hallmark runner does not advertise `--storage-state` support.


## Canonical host law

Production OAuth-backed capture, authenticated Hallmark, and Tier 4 default to `https://network.joinwestpeek.com` because the OAuth redirect URI and state cookie must share the same host. The `pages.dev` URL may be used for anonymous deployment smoke, but not as the default origin for production OAuth capture.
