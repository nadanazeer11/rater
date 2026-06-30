#!/usr/bin/env bash
# Create a Postmark webhook subscription pointing at our /webhooks/postmark
# endpoint, with HTTP Basic Auth matching POSTMARK_WEBHOOK_USERNAME /
# POSTMARK_WEBHOOK_PASSWORD from .env. Enables Delivery + Bounce +
# SpamComplaint + Open triggers (the four the controller handles).
#
# Usage:
#   scripts/postmark/create-webhook.sh <public-webhook-url>
#
# Example (local dev with ngrok tunnel):
#   scripts/postmark/create-webhook.sh https://abcd1234.ngrok-free.app/webhooks/postmark
#
# If you already have a webhook on this server, run list-webhooks.sh first to
# see its ID, then either delete it via the Postmark dashboard or update via
# PUT https://api.postmarkapp.com/webhooks/{id} (left as a manual step — URLs
# don't change often once the tunnel is stable).

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <public-webhook-url>" >&2
  echo "Example: $0 https://abcd1234.ngrok-free.app/webhooks/postmark" >&2
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

STREAM="${POSTMARK_MESSAGE_STREAM:-outbound}"

# Construct the JSON body with jq if available (safe escaping), else printf.
if command -v jq >/dev/null 2>&1; then
  BODY=$(jq -n \
    --arg url "$URL" \
    --arg stream "$STREAM" \
    --arg user "$POSTMARK_WEBHOOK_USERNAME" \
    --arg pass "$POSTMARK_WEBHOOK_PASSWORD" \
    '{
      Url: $url,
      MessageStream: $stream,
      HttpAuth: { Username: $user, Password: $pass },
      Triggers: {
        Delivery: { Enabled: true },
        Bounce: { Enabled: true, IncludeContent: false },
        SpamComplaint: { Enabled: true, IncludeContent: false },
        Open: { Enabled: true, PostFirstOpenOnly: false },
        Click: { Enabled: false },
        SubscriptionChange: { Enabled: false }
      }
    }')
else
  printf -v BODY '{
    "Url": "%s",
    "MessageStream": "%s",
    "HttpAuth": { "Username": "%s", "Password": "%s" },
    "Triggers": {
      "Delivery": { "Enabled": true },
      "Bounce": { "Enabled": true, "IncludeContent": false },
      "SpamComplaint": { "Enabled": true, "IncludeContent": false },
      "Open": { "Enabled": true, "PostFirstOpenOnly": false },
      "Click": { "Enabled": false },
      "SubscriptionChange": { "Enabled": false }
    }
  }' "$URL" "$STREAM" "$POSTMARK_WEBHOOK_USERNAME" "$POSTMARK_WEBHOOK_PASSWORD"
fi

echo "Creating Postmark webhook for stream='$STREAM' url='$URL' …"
curl -fsS "https://api.postmarkapp.com/webhooks" \
  -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Postmark-Server-Token: $POSTMARK_SERVER_TOKEN" \
  -d "$BODY" \
  | (command -v jq >/dev/null 2>&1 && jq . || cat)
echo
