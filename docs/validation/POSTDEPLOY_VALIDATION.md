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

## Network OS locked lifecycle order

1. `npm run release:postpush`
2. `npm run release:live-proof`
3. `npm run postdeploy:authenticated-click-audit` against the freshly populated Tier 4 dataset
4. `npm run release:cleanup`
5. `npm run postdeploy:authenticated-click-audit` after cleanup
6. `npm run release:report`

The populated audit checks every authenticated route on desktop and the seven highest-risk/data-heavy routes on mobile. It must detect raw HTML, malformed encoding, JSON leakage, unbounded long text, overflow, and column collisions.
