#!/bin/sh
set -e

# Target directory where Nginx serves static assets
TARGET_FILE="/usr/share/nginx/html/env-config.js"

# 1. Sanitize & validate VITE_GA4_MEASUREMENT_ID
# Must strictly match format G-[A-Z0-9]{4,15} and not be a dummy placeholder
RAW_GA4_ID="${VITE_GA4_MEASUREMENT_ID:-}"
CLEAN_GA4_ID=""
if echo "$RAW_GA4_ID" | grep -Eq '^G-[A-Z0-9]{4,15}$'; then
  case "$RAW_GA4_ID" in
    G-XXXXXXXXXX*|G-0000000000*|G-YOUR_*|G-PLACEHOLDER*)
      CLEAN_GA4_ID=""
      ;;
    *)
      CLEAN_GA4_ID="$RAW_GA4_ID"
      ;;
  esac
fi

# 2. Normalize VITE_ANALYTICS_ENABLED (strictly "true" or "false")
RAW_ENABLED="${VITE_ANALYTICS_ENABLED:-}"
CLEAN_ENABLED="false"
case "$(echo "$RAW_ENABLED" | tr '[:upper:]' '[:lower:]')" in
  true|1|yes|on)
    CLEAN_ENABLED="true"
    ;;
  *)
    CLEAN_ENABLED="false"
    ;;
esac

# 3. Normalize VITE_APP_ENV (strictly "dev" or "local")
RAW_APP_ENV="${VITE_APP_ENV:-dev}"
CLEAN_APP_ENV=$(echo "$RAW_APP_ENV" | tr -cd '[:alnum:]_-' | tr '[:upper:]' '[:lower:]')
if [ -z "$CLEAN_APP_ENV" ]; then
  CLEAN_APP_ENV="dev"
fi

# 4. Safely generate /usr/share/nginx/html/env-config.js
# Exposes ONLY the three intended public configuration values; zero server secrets leaked
cat <<EOF > "$TARGET_FILE"
// Dynamic runtime environment configuration generated at container startup
window.__ENV__ = Object.freeze({
  VITE_GA4_MEASUREMENT_ID: "$CLEAN_GA4_ID",
  VITE_ANALYTICS_ENABLED: "$CLEAN_ENABLED",
  VITE_APP_ENV: "$CLEAN_APP_ENV"
});
EOF

chmod 644 "$TARGET_FILE"

exec "$@"
