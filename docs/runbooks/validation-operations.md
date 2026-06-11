# Validation Operations — West Peek Network OS

Status: ACTIVE  
Date: 2026-06-11

## Canonical command

```bash
npm run validate:everything
```

The orchestrator reads `_repo_validation_matrix.json`, runs selected lanes, and writes:

- `reports/validate-everything.md`
- `reports/validate-everything.json`
- `logs/validate-everything-*.log`

## Static / CI tier

```bash
npm run validate:everything -- --tier=1
```

## Required trigger lanes

- `#wpnetwork`
- `#addtowestpeek`
- `#westpeeknetwork`
- `#wpdealflow`
- `#dealflow`

The app is not considered complete if these triggers are not represented in runtime, docs, and tests.

## Local Playwright

```bash
npm run test:e2e:maxdepth
```

## Live provider proof

Live Gmail trigger proof is separate. It must prove that a real Gmail/OAuth search/trigger ingestion writes to Google Sheets with the same fields as the local test harness.

Required live proof rows:

1. `#wpnetwork` creates human-review network intake only.
2. `#wpdealflow` creates founder/prospective deal-flow intake.
3. `#dealflow` alias creates founder/prospective deal-flow intake.
4. No triggered row has `execution_allowed=true`.
5. No triggered row creates/sends external communication automatically.
