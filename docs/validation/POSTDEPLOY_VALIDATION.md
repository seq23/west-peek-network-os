# Postdeploy Strict Validation

Command:

```bash
POSTDEPLOY_BASE_URL=https://your-deployed-url \
PLAYWRIGHT_BASE_URL=https://your-deployed-url \
SMOKE_BASE_URL=https://your-deployed-url \
npm run validate:postdeploy:strict
```

This is Tier 3 deployed runtime proof. It checks deployed smoke, click audit, auth boundary, provider health, public event smoke, Pitch Lab route safety, OAuth route safety, no localhost links, and no raw crash pages.

It does not prove full Gmail/OAuth/Sheets provider lifecycle. Tier 4 does that.
