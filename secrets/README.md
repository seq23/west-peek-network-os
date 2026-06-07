# Secrets

Locked local/operator encrypted secrets bundle:

```text
secrets/network-os.local.env.gpg
```

Password/passphrase:

```text
3021WPeek
```

The password is intentionally not embedded in decrypt scripts.

This baseline artifact includes an encrypted placeholder bundle so the workflow is present. Replace its decrypted placeholder values with real local/operator secrets, then re-encrypt before production use.
