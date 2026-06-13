# Local Updater Runbook

Use the generic updater with the full baseline ZIP from the correct root:

```bash
ALLOW_LARGE_DELETE=1 ~/update_repo_from_zip_generic_v3.sh "$HOME/Downloads/west-peek-network-os-main_BASELINE_06-12-26_<sha>.zip" "/Users/sequoiataylor/Documents/GitHub/west-peek-network-os" snapshot "west-peek-network-os"
```

The updater performs local validation, commit, and push. Do not claim live Tier 4 success from updater validation.
