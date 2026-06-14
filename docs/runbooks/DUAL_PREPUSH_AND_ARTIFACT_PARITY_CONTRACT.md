# Dual Prepush and Artifact Parity Contract

**Repo:** west-peek-network-os  
**Status:** LOCKED

## Profiles

- `release:prepush:container`: browserless Level 1 proof.
- `release:prepush:local`: real-browser Level 2 gate before commit/push.
- `release:prepush`: environment-aware router; local mode may not fall back.

## Repo shape

Authentication/profile: **authenticated**. Applicable populated deployed audits: postdeploy:authenticated-click-audit.

## Required order

Container prepush → UI/test parity → browser-suite contract → package from validated root → source/artifact parity → reopen → container prepush → local updater → local prepush → CI/deploy → postpush → live proof → populated audit(s) → exact cleanup → post-cleanup integrity → report.

## Status law

Container completion is `FIRST-COMMAND-READY`, not browser-proven. `FIRST-COMMAND-GREEN PROVEN` requires local browser evidence tied to the exact artifact/applied source hash.
