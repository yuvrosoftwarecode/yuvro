#!/bin/bash
# Deploy YMarketplace only
# Usage: bash infra/scripts/deploy-ymarketplace.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# YMarketplace-specific nginx setup
setup_nginx() {
    local ip=$1 app="${2:-ymarketplace}"
    print_header "Setting up Nginx + SSL for YMarketplace"

    # YMarketplace domains
    local domains="marketplace-dev.yuvro.ai marketplace-backend-dev.yuvro.ai marketplace.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << NGINX_SETUP
set -e
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# ── 1. Clean up any stale separate configs from previous attempts ─────────────
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace.conf
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace-http.conf
sudo rm -f /etc/nginx/sites-available/yuvro-ymarketplace-http.conf

# ── 2. Strip any previously appended marketplace blocks from yuvro-dev ───────
if grep -q "marketplace" /etc/nginx/sites-available/yuvro-dev 2>/dev/null; then
    sudo sed -i '/# ── YMarketplace/,/^}/{ /^}/{ N; /^}\n/d }; d }' \
        /etc/nginx/sites-available/yuvro-dev 2>/dev/null || true
    # Simpler approach: rebuild yuvro-dev without marketplace sections
    sudo python3 -c "
import re, sys
txt = open('/etc/nginx/sites-available/yuvro-dev').read()
# Remove everything from first marketplace comment to end
txt = re.sub(r'\n# ── YMarketplace.*', '', txt, flags=re.DOTALL)
open('/etc/nginx/sites-available/yuvro-dev', 'w').write(txt)
" && echo "   removed old marketplace blocks from yuvro-dev"
fi

# ── 3. Issue certs for each domain that resolves to this server ──────────────
sudo mkdir -p /var/www/certbot
sudo ln -sf /etc/nginx/sites-available/yuvro-dev /etc/nginx/sites-enabled/yuvro-dev 2>/dev/null || true

# Start nginx in HTTP-only mode so certbot webroot can work
sudo nginx -t 2>/dev/null && { sudo systemctl is-active nginx && sudo systemctl reload nginx || sudo systemctl restart nginx; } || sudo systemctl restart nginx

for d in "\${DOMAINS[@]}"; do
    if [ -d "/etc/letsencrypt/live/\$d" ]; then
        echo "✓ cert exists: \$d"
    elif ! host "\$d" >/dev/null 2>&1; then
        echo "⚠ skipping \$d — no DNS record yet"
    else
        sudo certbot certonly --webroot --webroot-path /var/www/certbot \
            --non-interactive --agree-tos --email "\$CERT_EMAIL" -d "\$d" \
            && echo "✓ cert issued: \$d" \
            || echo "⚠ certbot failed: \$d"
    fi
done

# ── 4. Append nginx blocks — full HTTPS if cert exists, HTTP-only if not ─────
MARKETPLACE_CONF=""

for d in "\${DOMAINS[@]}"; do
    # Determine upstream port
    case "\$d" in
        marketplace-backend-dev.yuvro.ai) PORT=8004 ; TYPE=backend ;;
        *) PORT=3004 ; TYPE=frontend ;;
    esac

    if [ -d "/etc/letsencrypt/live/\$d" ]; then
        # Full HTTP→HTTPS + SSL block
        if [ "\$TYPE" = "frontend" ]; then
            MARKETPLACE_CONF="\${MARKETPLACE_CONF}
# ── YMarketplace \$d
server {
    listen 80;
    server_name \$d;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\\\$host\\\$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name \$d;
    ssl_certificate     /etc/letsencrypt/live/\$d/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/\$d/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/\$d/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security \"max-age=63072000; includeSubDomains\" always;
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json image/svg+xml font/woff font/woff2;
    client_max_body_size 50M;
    location / {
        proxy_pass http://localhost:\$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 60s; proxy_connect_timeout 10s;
    }
}"
        else
            MARKETPLACE_CONF="\${MARKETPLACE_CONF}
# ── YMarketplace \$d
server {
    listen 80;
    server_name \$d;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\\\$host\\\$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name \$d;
    ssl_certificate     /etc/letsencrypt/live/\$d/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/\$d/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/\$d/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security \"max-age=63072000; includeSubDomains\" always;
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    client_max_body_size 50M;
    location / {
        proxy_pass http://localhost:\$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 120s; proxy_connect_timeout 10s;
    }
}"
        fi
    else
        # HTTP-only block — acme-challenge only, redirect port 80 to HTTPS (will upgrade once cert exists)
        MARKETPLACE_CONF="\${MARKETPLACE_CONF}
# ── YMarketplace \$d (HTTP only — cert pending)
server {
    listen 80;
    server_name \$d;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\\\$host\\\$request_uri; }
}"
    fi
done

echo "\$MARKETPLACE_CONF" | sudo tee -a /etc/nginx/sites-available/yuvro-dev > /dev/null
echo "✓ marketplace nginx blocks written"

# ── 5. Test and reload ────────────────────────────────────────────────────────
if sudo nginx -t; then
    sudo systemctl is-active nginx && sudo systemctl reload nginx || sudo systemctl restart nginx
    echo "✓ nginx reloaded"
else
    echo "❌ nginx config error"
    sudo nginx -t
    exit 1
fi

# ── 6. Renewal cron ───────────────────────────────────────────────────────────
(sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | sudo crontab -
echo "✓ certbot renewal cron set"
NGINX_SETUP

    print_success "Nginx + SSL ready for YMarketplace"
}

ensure_infra_and_deploy "ymarketplace" "${1:-main}"
