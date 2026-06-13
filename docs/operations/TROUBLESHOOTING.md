# Troubleshooting

- Raw `atob()` private-key errors should now map to `GOOGLE_PRIVATE_KEY_INVALID_FORMAT`.
- If local env works but deployed fails, run postdeploy strict and Tier 4 runtime-context lane to classify Cloudflare/deployed env mismatch.
- If Gmail read imports nothing, confirm operator-seeded Gmail message includes the exact `WEST_PEEK_E2E_RUN_ID` and supported trigger tag.
- If Tier 4 blocks, inspect the lane log listed in `reports/tier4/tier4-ultimate-live-proof.md`.
