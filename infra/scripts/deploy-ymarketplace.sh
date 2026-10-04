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

    ssh_ec2 "ubuntu@$ip" bash << 'NGINX_SETUP'
set -e
DOMAINS=( marketplace-dev.yuvro.ai marketplace-backend-dev.yuvro.ai marketplace.yuvro.ai )
CERT_EMAIL="rohith@yuvro.ai"
YUVRO_DEV=/etc/nginx/sites-available/yuvro-dev

# ── 1. Clean up stale separate marketplace configs ────────────────────────────
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace.conf
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace-http.conf
sudo rm -f /etc/nginx/sites-available/yuvro-ymarketplace-http.conf

# ── 2. Strip old marketplace blocks from yuvro-dev ────────────────────────────
MARKER_LINE=$(grep -n "marketplace-dev\|marketplace-backend-dev\|marketplace\.yuvro" $YUVRO_DEV 2>/dev/null | head -1 | cut -d: -f1)
if [ -n "$MARKER_LINE" ]; then
    TRIM_LINE=$(( MARKER_LINE - 1 ))
    sudo head -n $TRIM_LINE $YUVRO_DEV | sudo tee /tmp/yuvro-dev-trim > /dev/null
    sudo cp /tmp/yuvro-dev-trim $YUVRO_DEV
    echo "   trimmed marketplace blocks from yuvro-dev at line $MARKER_LINE"
fi

# ── 3. Ensure nginx is running for certbot webroot challenge ──────────────────
sudo mkdir -p /var/www/certbot
sudo ln -sf $YUVRO_DEV /etc/nginx/sites-enabled/yuvro-dev 2>/dev/null || true
sudo nginx -t 2>/dev/null && { sudo systemctl is-active nginx >/dev/null && sudo systemctl reload nginx || sudo systemctl restart nginx; } || sudo systemctl restart nginx
sleep 1

# ── 4. Issue certs — skip domains with no DNS ─────────────────────────────────
for d in "${DOMAINS[@]}"; do
    if [ -d "/etc/letsencrypt/live/$d" ]; then
        echo "✓ cert exists: $d"
    elif ! host "$d" >/dev/null 2>&1; then
        echo "⚠ skipping $d — no DNS record yet"
    else
        sudo certbot certonly --webroot --webroot-path /var/www/certbot \
            --non-interactive --agree-tos --email "$CERT_EMAIL" -d "$d" \
            && echo "✓ cert issued: $d" \
            || echo "⚠ certbot failed: $d"
    fi
done

# ── 5. Write nginx blocks via Python (avoids nested heredoc issues) ───────────
sudo python3 << 'PYEOF'
import os

DOMAINS = [
    ("marketplace-dev.yuvro.ai",         3004, "frontend"),
    ("marketplace-backend-dev.yuvro.ai",  8004, "backend"),
    ("marketplace.yuvro.ai",              3004, "frontend"),
]

def frontend_block(domain, port):
    return f"""server {{
    listen 80;
    server_name {domain};
    location /.well-known/acme-challenge/ {{ root /var/www/certbot; }}
    location / {{ return 301 https://$host$request_uri; }}
}}
server {{
    listen 443 ssl http2;
    server_name {domain};
    ssl_certificate     /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/{domain}/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json image/svg+xml font/woff font/woff2;
    client_max_body_size 50M;
    location / {{
        proxy_pass http://localhost:{port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }}
}}"""

def backend_block(domain, port):
    return f"""server {{
    listen 80;
    server_name {domain};
    location /.well-known/acme-challenge/ {{ root /var/www/certbot; }}
    location / {{ return 301 https://$host$request_uri; }}
}}
server {{
    listen 443 ssl http2;
    server_name {domain};
    ssl_certificate     /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/{domain}/chain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    client_max_body_size 50M;
    location / {{
        proxy_pass http://localhost:{port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }}
}}"""

def http_only_block(domain):
    return f"""server {{
    listen 80;
    server_name {domain};
    location /.well-known/acme-challenge/ {{ root /var/www/certbot; }}
    location / {{ return 301 https://$host$request_uri; }}
}}"""

blocks = []
for domain, port, dtype in DOMAINS:
    cert_path = f"/etc/letsencrypt/live/{domain}"
    if os.path.isdir(cert_path):
        if dtype == "frontend":
            blocks.append(frontend_block(domain, port))
            print(f"✓ HTTPS frontend block: {domain}")
        else:
            blocks.append(backend_block(domain, port))
            print(f"✓ HTTPS backend block: {domain}")
    else:
        blocks.append(http_only_block(domain))
        print(f"⚠ HTTP-only block (cert pending): {domain}")

conf_path = "/etc/nginx/sites-available/yuvro-dev"
with open(conf_path, "a") as f:
    f.write("\n" + "\n".join(blocks) + "\n")
print("✓ marketplace blocks appended to yuvro-dev")
PYEOF

# ── 6. Test and reload ────────────────────────────────────────────────────────
if sudo nginx -t 2>/dev/null; then
    sudo systemctl is-active nginx >/dev/null && sudo systemctl reload nginx || sudo systemctl restart nginx
    echo "✓ nginx reloaded"
else
    echo "❌ nginx config error:"
    sudo nginx -t
    exit 1
fi

# ── 7. Renewal cron ───────────────────────────────────────────────────────────
(sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | sudo crontab -
echo "✓ certbot renewal cron set"
NGINX_SETUP

    print_success "Nginx + SSL ready for YMarketplace"
}

ensure_infra_and_deploy "ymarketplace" "${1:-main}"
