# Deployment and Postdeploy Runbook

After deploy, use explicit deployed URLs. Do not default to localhost for postdeploy or Tier 4 proof.

```bash
POSTDEPLOY_BASE_URL=https://your-deployed-url PLAYWRIGHT_BASE_URL=https://your-deployed-url SMOKE_BASE_URL=https://your-deployed-url npm run validate:postdeploy:strict
```
