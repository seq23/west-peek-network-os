# Playwright Local Testing

These tests prove browser-level behavior and local persistence paths.

## 1. Install dependencies

```bash
npm ci
```

## 2. Install Playwright browser binaries

```bash
npx playwright install chromium
```

If your machine is missing OS-level browser dependencies, run:

```bash
npx playwright install --with-deps chromium
```

On macOS, the regular Chromium install is usually enough.

## 3. Run the full local validation set

```bash
npm run build
npm run validate:all
npm run test:e2e
```

## 4. Run headed/browser-visible mode

```bash
npx playwright test --headed
```

## 5. Run one test file

```bash
npx playwright test tests/e2e/network-os.spec.ts
```

## 6. Debug interactively

```bash
npx playwright test --ui
```

## What the E2E tests currently cover

- Dashboard exposes primary West Peek Network actions.
- Instructions page includes canonical trigger and in-the-moment capture examples.
- Manual Add persists a contact after reload.
- Exact duplicate email is blocked.
- Intake capture creates a real Intake Queue item.
- Intake conversion creates a contact and persists after reload.
- Approval decision resolves the related notification state.

## Current container note

Browser E2E could not be run in the artifact build container because the Playwright Chromium executable is not installed there. The test command fails before app execution with the standard Playwright message requiring `npx playwright install`.
