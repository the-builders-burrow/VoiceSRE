#!/usr/bin/env bash
# Fires a fake Sentry incident at the local webhook to drive the full pipeline.
# Usage: pnpm dev  (in another terminal)  then  bash scripts/trigger-demo.sh
set -euo pipefail
URL="${1:-http://localhost:3000}"

curl -sS -X POST "$URL/api/webhooks/sentry" \
  -H "Content-Type: application/json" \
  -d '{
    "data": { "issue": { "id": "DEMO-1", "title": "TypeError: cannot read x of undefined", "metadata": { "value": "x is undefined" } } },
    "event": {
      "environment": "production",
      "entries": [
        { "type": "exception", "data": { "values": [ { "stacktrace": { "frames": [ { "filename": "app/lib/foo.ts", "lineNo": 42 } ] } } ] } }
      ]
    }
  }'
echo
echo "Incident dispatched — watch http://localhost:3000"
