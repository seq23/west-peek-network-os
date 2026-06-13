# Hostile UX/Data-Integrity Review — 2026-06-13

## Verdict

The first remediation materially improved operator trust but was not release-clean. The hostile pass found and corrected five defects without major refactoring.

## Defects found and fixed

1. **Shared inbox overcapture:** every message to `info@westpeek.ventures` was treated as founder deal flow. Replaced with a deterministic weighted classifier that captures pitches, company information, and relevant relationship messages while skipping operational and marketing noise.
2. **Wrong contact extraction:** the parser excluded the signed-in operator but not the monitored shared mailbox, allowing `info@westpeek.ventures` to be selected as the person. Both are now excluded; Reply-To is also considered.
3. **Multipart duplication:** plain-text and HTML alternatives were concatenated. Extraction now prefers readable plain text, then HTML, then snippet.
4. **Weak duplicate resistance:** intake IDs were random and the Sheets duplicate set was read only once. IDs are deterministic by mailbox/message, and Sheets is re-read immediately before append.
5. **Schema maintenance drift:** the local Sheet-maintenance header registry omitted Gmail idempotency and classification columns. It now matches the canonical runtime contract.

## Improvement ceiling without major refactoring

The current design is the strongest reasonable Google-Sheets-only implementation. A true cross-region atomic uniqueness guarantee would require a durable database, queue, lock service, or Google Apps Script transaction layer. That is intentionally out of scope.

The classifier is inspectable and low-cost. An AI classifier would add provider latency, cost, nondeterminism, privacy exposure, and another failure mode. It should be introduced only after real false-positive/false-negative evidence shows the deterministic monitor is insufficient.

## Validator review

- No new validator was created.
- Existing provider contract validation was strengthened.
- Matrix proof boundaries were corrected.
- Three stale release summaries and one superseded implementation report were archived.
- Active documentation now points to one consolidated changelog and one intelligent-inbox contract.

## Validation executed

- TypeScript typecheck: passed.
- Production build: passed.
- Provider error/intelligent inbox contract: passed.
- Documentation consolidation: passed.
- Validator admission: passed.
- Matrix consistency: passed.
- Structure validation: passed.
- Domain workflow checks: passed.
- OAuth contract: passed.
- Raw atob error check: passed.
- Docs/package-script consistency: passed.

## Unproven

- Live Gmail classification accuracy.
- Cross-instance duplicate behavior under simultaneous deployed syncs.
- Live Google Sheets maintenance behavior.
- Headed Playwright and deployed Cloudflare runtime.
