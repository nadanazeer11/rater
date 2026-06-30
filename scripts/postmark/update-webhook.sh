#!/usr/bin/env bash
# Update an existing Postmark webhook's URL — handy when ngrok hands you a
# new tunnel URL on every restart. Auto-discovers the webhook ID by message
# stream (we only ever have one webhook per stream), and re-sends the
# HttpAuth from .env so the Basic Auth stays in sync if you rotated it.
#
# Usage:
#   scripts/postmark/update-webhook.sh <new-public-webhook-url>
#
# Example:
#   scripts/postmark/update-webhook.sh https://abcd-1234.ngrok-free.app/webhooks/postmark

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <new-public-webhook-url>" >&2
  echo "Example: $0 https://abcd-1234.ngrok-free.app/webhooks/postmark" >&2
  exit 1
fi

URL="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

: "${POSTMARK_SERVER_TOKEN:?POSTMARK_SERVER_TOKEN is required (set in .env)}"
: "${POSTMARK_WEBHOOK_USERNAME:?POSTMARK_WEBHOOK_USERNAME is required (set in .env)}"
: "${POSTMARK_WEBHOOK_PASSWORD:?POSTMARK_WEBHOOK_PASSWORD is required (set in .env)}"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required for this script (used to look up the webhook ID)." >&2
  echo "Install: sudo apt install jq    (or brew install jq)" >&2
  exit 1
fi

STREAM="${POSTMARK_MESSAGE_STREAM:-outbound}"

echo "Looking up existing webhook for stream='$STREAM'…"
LIST=$(curl -fsS "https://api.postmarkapp.com/webhooks?MessageStream=${STREAM}" \
  -H "Accept: application/json" \
  -H "X-Postmark-Server-Token: $POSTMARK_SERVER_TOKEN")

ID=$(echo "$LIST" | jq -r '.Webhooks[0].ID // empty')

if [ -z "$ID" ]; then
  echo "No existing webhook found on stream '$STREAM'." >&2
  echo "Use create-webhook.sh to make one first." >&2
  exit 1
fi

COUNT=$(echo "$LIST" | jq -r '.Webhooks | length')
if [ "$COUNT" -gt 1 ]; then
  echo "Warning: found $COUNT webhooks on this stream; updating the first one (ID=$ID)." >&2
fi

echo "Updating webhook ID=$ID -> $URL"

BODY=$(jq -n \
  --arg url "$URL" \
  --arg user "$POSTMARK_WEBHOOK_USERNAME" \
  --arg pass "$POSTMARK_WEBHOOK_PASSWORD" \
  '{
    Url: $url,
    HttpAuth: { Username: $user, Password: $pass }
  }')

curl -fsS "https://api.postmarkapp.com/webhooks/$ID" \
  -X PUT \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Postmark-Server-Token: $POSTMARK_SERVER_TOKEN" \
  -d "$BODY" \
  | jq .
echo
