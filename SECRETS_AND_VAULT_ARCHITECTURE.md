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
