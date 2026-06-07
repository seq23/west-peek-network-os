# Hostile Review: Capture + OCR + Audio + Thank-You Changes

## Reviewed risks

1. **Fake HEIC support** — raw HEIC is not sent to Claude as if it were guaranteed. UI attempts browser-side normalization to JPEG. Server blocks raw HEIC with an explicit error if conversion did not happen.
2. **Runaway AI spend** — image and audio uploads are capped. Audio uses Google Speech-to-Text; Claude receives extracted/transcribed text for structuring.
3. **Auto-execution risk** — every capture/thank-you route persists review states only: `pending_human_review` or `pending_approval`. `execution_allowed` remains false.
4. **Partial contact rejection** — minimal Gmail capture is allowed. Missing fields are tracked instead of failing the intake.
5. **Browser spoofing** — provider routes require authenticated Google session via `requireAuthenticatedUser`.
6. **Provider secrets** — added `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_SPEECH_LOCATION`, and `ANTHROPIC_VISION_MODEL` to safe examples and Cloudflare push allowlist.
7. **Data trace** — media capture and thank-you routes return `internal_data_trace` and persist trace fields.

## Not claimed without deployment

- Google Speech-to-Text provider success is not locally proven without deployed secrets and Google Cloud billing/permissions.
- Claude vision provider success is not locally proven without Anthropic credits.
- Playwright browser execution is not claimed unless local browsers are installed.
