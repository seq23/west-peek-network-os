# Architectural Decisions

## Tier 4 introduction

User approved introducing Tier 4 for `west-peek-network-os` as the final postdeploy live E2E provider + data proof layer.

Predeploy validation proves Tier 4 readiness. Postdeploy strict proves deployed smoke/safety. Tier 4 proves live provider/data behavior.

## Google private key parsing

Google service-account private-key parsing is centralized in `functions/_shared/googlePrivateKey.ts` so malformed keys return `GOOGLE_PRIVATE_KEY_INVALID_FORMAT` instead of leaking raw `atob()` runtime errors.
