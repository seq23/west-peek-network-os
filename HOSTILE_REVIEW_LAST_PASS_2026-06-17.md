# Hostile Review — June 17, 2026 Last-Pass Audit

## Scope

Reviewed the June 16 Network OS changes for:

- contact archive/restore;
- Gmail `#wpnetwork` / `#wpdealflow` replies and forwards;
- internal-address exclusion;
- Pitch Lab queue-only intake;
- deal-flow/owner conversion controls;
- founder email rendering;
- regression-test integrity.

## Findings and repairs

### HR-01 — Plain-text founder email deletion — CRITICAL — repaired

The Gmail sanitizer treated a plain-text mailbox such as `Founder <founder@company.com>` as an HTML tag and removed the address before target resolution. Earlier tests called the resolver directly and bypassed this production normalization path.

Repair:

- plain text and HTML now use separate normalization modes;
- literal angle-bracket mailboxes survive plain-text processing;
- regression tests execute normalization before resolution.

### HR-02 — Multi-part forward truncation — HIGH — repaired

Gmail extraction selected the first nonempty MIME part and discarded later parts. A wrapper containing only the trigger could therefore hide a nested forwarded message containing the founder.

Repair:

- normalized plain and HTML MIME segments are combined and deduplicated;
- current wrapper text is retained separately for operator-entered fields;
- nested/original content remains available for founder and company extraction.

### HR-03 — Archive row not strictly projected — HIGH — repaired

The archive endpoint removed its explicit `source_detail` assignment but still spread the full live row. Strict projection is now used so legacy or unexpected row keys cannot reach the canonical Contacts append contract.

### HR-04 — Pitch Lab explicit no-touch boundary ignored — CRITICAL — repaired

Pitch Lab intake sets `parsed_needs_touch=false`, but conversion could infer a touch from packet language such as “help needed: introductions.” That violated the no-auto-action contract.

Repair:

- explicit false/no/0 now overrides inference;
- Pitch Lab conversion cannot create a relationship touch from packet wording alone;
- explicit true or a chosen touch method still creates only a pending-approval touch.

### HR-05 — Intake review runtime values trusted TypeScript only — HIGH — repaired

The API accepted unsupported action, owner, and deal-flow values at runtime because TypeScript types do not validate JSON.

Repair:

- unsupported actions return 400;
- invalid deal-flow values return 400;
- invalid owner values return 400.

### HR-06 — Attach could reference a nonexistent contact — HIGH — repaired

The queue could be marked attached to an arbitrary or mistyped contact ID.

Repair:

- attach now verifies the target contact exists before writing the decision row.

### HR-07 — Company completeness used the wrong value — MEDIUM — repaired

Gmail could infer a company successfully but still mark company as missing because completeness checked the pre-resolution field instead of the final parsed company.

### HR-08 — Receiver documentation contradicted runtime — MEDIUM — repaired

The handoff review documented `database_write_status=stored`, duplicated `profile_created`, and referenced the wrong pending status. Documentation now matches queue-only runtime behavior.

### HR-09 — Critical hostile tests were not in the standard prepush aggregate — HIGH — repaired

The trigger/Sheets hostile suite existed but was not executed by `validate:all`.

Repair:

- `validate:trigger-sheet-proof` is now part of `validate:all` and therefore container/local prepush.

## Executed proof

- TypeScript: pass
- trigger/Sheets hostile regression suite: pass
- Pitch Lab profile and packet contract tests: pass
- critical UI/data-flow test: pass
- complete container prepush: pass
- production build: pass
- UI/test parity: pass
- browser-suite contract: pass

## Unexecuted proof

- local headed browser proof;
- deployed Gmail provider mutation/readback;
- deployed Google Sheets archive/readback;
- deployed signed Pitch Lab handoff.

These remain local/deployed lifecycle gates and are not simulated in the container.


## Tier 4 follow-up defect — proof ledger visibility

The deployed Gmail lifecycle proof failed because `/api/sheets/snapshot` did not include `provider_replay_guard`, while the live proof expected to inspect Gmail watermark, cursor, and ingestion-ledger rows through that endpoint. The product Gmail import itself succeeded. The repair adds an authenticated `include_proof=1` snapshot mode and updates the live proof to request it explicitly. Normal UI snapshots remain unchanged.
