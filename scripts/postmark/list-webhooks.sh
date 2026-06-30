#!/usr/bin/env bash
# List all Postmark webhooks on the server identified by POSTMARK_SERVER_TOKEN.
# Reads from .env at the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

: "${POSTMARK_SERVER_TOKEN:?POSTMARK_SERVER_TOKEN is required (set in .env)}"

STREAM="${POSTMARK_MESSAGE_STREAM:-outbound}"

curl -fsS "https://api.postmarkapp.com/webhooks?MessageStream=${STREAM}" \
  -H "Accept: application/json" \
  -H "X-Postmark-Server-Token: $POSTMARK_SERVER_TOKEN" \
  | (command -v jq >/dev/null 2>&1 && jq . || cat)
echo
