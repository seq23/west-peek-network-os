# Autonomous Terminal Runbook

**Repo:** `west-peek-network-os`

Terminal Mode is Juniper-directed remote engineering. The owner copies one command and returns output; Juniper selects and interprets every technical step.

## Canonical order

1. Six-step repo identity check.
2. Apply the verified baseline through the authorized v3.1 updater with local push pause when preview is required.
3. `npm run auth:restore` and `npm run auth:status`.
4. `npm run release:validate:container`
5. `npm run release:self-heal`
6. `npm run release:hallmark`
7. `npm run release:prepush`
8. Localhost operator approval, then push.
9. Verify GitHub Actions and deployment.
10. `npm run release:close-lifecycle`, which runs postpush → Tier 4 live proof → populated authenticated audit → exact cleanup → post-cleanup authenticated audit → final report.

Every long command captures logs. Routine failures remain Juniper's work queue.
