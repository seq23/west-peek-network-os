# WEST PEEK SUITE — LOCKED RELEASE LIFECYCLE CONTRACT

**Status:** LOCKED / CANONICAL
**Applies to:** Network OS, Agency Event OS, Pitch Lab

## Universal lifecycle

1. Container structural proof.
2. Package from the true repository root.
3. Reopen the final ZIP and rerun artifact-safe validation.
4. Run the exact repository `release:prepush` contract against the final artifact before delivery.
5. Apply ZIP locally.
6. Run local real-browser visual proof and preserve evidence externally.
7. Commit and push only after local gates pass.
8. Verify GitHub Actions and deployment.
9. Run `release:postpush`.
10. Run repo-specific `release:live-proof`.
11. Run the populated deployed click-audit lanes applicable to the repo.
12. Run exact fixture cleanup.
13. Run the repo-specific post-cleanup integrity check.
14. Generate `release:report`.

## First-command-green delivery law

The local updater's first validation command must be treated as a confirmation gate, not a discovery environment. Before delivery, the final ZIP must be extracted into a clean workspace, dependencies installed from the lockfile, and the exact repo-owned `release:prepush` command executed. Any failure is repaired in source and the full baseline is rebuilt. Delivery is prohibited until the final reopened artifact has passed every proof layer available in the build environment.

When the build container cannot execute a real browser, it must run the registered structural/snapshot fallback and label real-browser proof as local-required. It may not claim screenshots or browser geometry. The local updater must then execute the real-browser lane before push.

## Evidence preservation

Browser screenshots, traces, geometry maps, and reports must be copied outside the repo before cleanup or snapshot replacement:

`~/repo-validation-evidence/<repo>/<run-id>/`

Generated run evidence is not required inside baseline ZIPs.

## Non-substitution law

Container structural proof does not replace local browser proof. Local browser proof does not replace deployed click audits. Deployed click audits do not replace live mutation/readback or cleanup proof.

## Repository profile: west-peek-network-os

- Applicable deployed surface: authenticated
- Live proof command: `npm run release:live-proof`
- Populated audit command: `npm run postdeploy:authenticated-click-audit`
- Post-cleanup integrity command: `npm run postcleanup:integrity`
- Local visual proof command: `npm run release:local-visual-proof`
- Notes: Authenticated Level 5 system. Tier 4 creates controlled provider/data fixtures. Populated audit is authenticated. Cleanup is exact-ID based.
