# Introduction send guard

Deploy this Worker (`wrangler deploy --config workers/intro-send-guard/wrangler.toml`) before the Pages deployment. Its durable object migration is in the Worker configuration. The Pages `wrangler.toml` binds to the deployed Worker by `script_name`; missing binding disables all in-app sends. Never delete the Durable Object namespace or its claim storage during rollback: a claim may represent an email accepted by Gmail whose HTTP response was lost.

Update the Google OAuth consent screen for `https://www.googleapis.com/auth/gmail.send`. Each operator reconnects their own Google account. Create/validate the `introductions` tab with the exact schema before enabling the route. Send one approved test pair to two owner-controlled mailboxes and inspect Gmail Sent, the introduction row, touches, and the guard's duplicate response. If the Gmail response is ambiguous, stop and reconcile before any manual send.
