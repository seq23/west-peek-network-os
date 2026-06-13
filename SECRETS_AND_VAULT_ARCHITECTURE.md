<!-- GENERATED_BY=generic-testing-architecture-capability-installer -->
# Secrets and Vault Architecture

Declared mode: vault_preferred

Allowed modes:
- vault_required: encrypted vault and audited hooks are mandatory for live/provider proof.
- vault_preferred: fixture/local testing may continue; live-provider proof requires an approved secret source.
- plaintext_legacy: temporary exception only; requires documented migration and never permits committed secrets.

Canonical test secret modes:
- fixture: no production credentials.
- vault-test: temporary credentials materialized by repo-owned vault hooks.
- live-provider: explicit guarded runtime proof.

The generic installer does not create or decrypt a provider vault. Repo-owned hooks must materialize secrets to a temporary file outside the repo, print no values, and remove material in finally/trap semantics.

## Authenticated browser-state vault

The environment vault and authenticated browser-state vault are separate security domains.

- Environment secrets remain governed by the encrypted environment vault.
- Google-authenticated Playwright state is governed by `AUTH_STATE_VAULT.md`.
- Canonical auth-state ciphertext lives outside the repository under `~/AI_AUTH_VAULTS/west-peek-network-os/`.
- `.auth/` is disposable, gitignored material restored only when Tier 4 or authenticated Hallmark evidence is required.
- The same restored state is authorized for Tier 4 and Hallmark evidence collection; neither command may print cookie values.
