# Google Private Key Formats

Supported `GOOGLE_PRIVATE_KEY` formats:

- standard PEM
- escaped-newline PEM
- quoted PEM
- full service-account JSON containing `private_key`

Malformed keys return controlled error code `GOOGLE_PRIVATE_KEY_INVALID_FORMAT`.

Do not place raw private keys in reports or artifacts. If Cloudflare and local env differ, Tier 4/runtime context proof must classify the mismatch through behavior.
