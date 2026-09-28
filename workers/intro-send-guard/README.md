# Introduction send guard

Deploy this Worker (`wrangler deploy --config workers/intro-send-guard/wrangler.toml`) before enabling in-app sends. Its durable object migration is in the Worker configuration. Once it exists, add the following binding to the Pages `wrangler.toml` and redeploy Pages. Until then, the missing binding disables all in-app sends:

```toml
[[durable_objects.bindings]]
name = "INTRO_SEND_GUARD"
class_name = "IntroSendGuard"
script_name = "west-peek-intro-send-guard"
```

Never delete the Durable Object namespace or its claim storage during rollback: a claim may represent an email accepted by Gmail whose HTTP response was lost.

Update the Google OAuth consent screen for `https://www.googleapis.com/auth/gmail.send`. Each operator reconnects their own Google account. Create/validate the `introductions` tab with the exact schema before enabling the route. Send one approved test pair to two owner-controlled mailboxes and inspect Gmail Sent, the introduction row, touches, and the guard's duplicate response. If the Gmail response is ambiguous, stop and reconcile before any manual send.
