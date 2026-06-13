#!/usr/bin/env bash
set -Eeuo pipefail
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
npm run deep-validation
npm run validate:predeploy:full
printf '%s\n' 'PREPUSH PASSED'
