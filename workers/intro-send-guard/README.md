# Introduction send guard

Deploy this Worker before enabling in-app sends. The account ID in its config is the account shown by the existing Cloudflare Pages deployment for this repository; `wrangler deploy` will fail if the signed-in operator cannot deploy there. From a checkout of PR #11 on a computer with access to the owner's Cloudflare account:

```bash
npx wrangler login
npx wrangler whoami
npx wrangler deploy --config workers/intro-send-guard/wrangler.toml
```

The login happens in the operator's own browser. Do not paste a token into a chat, commit one, or alter the account ID to make deployment succeed. Save the Wrangler deployment result (Worker name, account, version and timestamp) for release proof. Its durable object migration is in the Worker configuration. Once it exists, add the following binding to the Pages `wrangler.toml` and redeploy Pages. Until then, the missing binding disables all in-app sends:

```toml
[[durable_objects.bindings]]
name = "INTRO_SEND_GUARD"
class_name = "IntroSendGuard"
script_name = "west-peek-intro-send-guard"
```

Never delete the Durable Object namespace or its claim storage during rollback: a claim may represent an email accepted by Gmail whose HTTP response was lost.

Update the Google OAuth consent screen for `https://www.googleapis.com/auth/gmail.send`. Each operator reconnects their own Google account. Create/validate the `introductions` tab with the exact schema before enabling the route. Send one approved test pair to two owner-controlled mailboxes and inspect Gmail Sent, the introduction row, touches, and the guard's duplicate response. If the Gmail response is ambiguous, stop and reconcile before any manual send.
