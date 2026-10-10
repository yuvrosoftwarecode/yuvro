#!/bin/bash
# Deploy YMarketplace only
# Usage: bash infra/scripts/deploy-ymarketplace.sh [branch]
#   branch  Git branch to deploy (default: main)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# YMarketplace-specific nginx setup
setup_nginx() {
    local ip=$1 app="${2:-ymarketplace}"
    print_header "Setting up Nginx + SSL for YMarketplace"

    # Copy YMarketplace nginx config
    scp_ec2 "$PROJECT_ROOT/ymarketplace/ymarketplace-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ymarketplace.conf"

    # YMarketplace domains
    local domains="marketplace-dev.yuvro.ai backend-marketplace-dev.yuvro.ai marketplace.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << CERTBOT
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# Remove default nginx config
sudo rm -f /etc/nginx/sites-enabled/default

# ── STAGE 1: Deploy HTTP-only config to allow certbot challenge ──────────────
# Create temporary HTTP-only nginx config for certificate issuance
sudo tee /etc/nginx/sites-available/yuvro-ymarketplace-http-only.conf > /dev/null << 'NGINX_HTTP'
# Temporary HTTP-only config for SSL certificate validation
server {
    listen 80;
    server_name marketplace-dev.yuvro.ai backend-marketplace-dev.yuvro.ai marketplace.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "OK"; }
}
NGINX_HTTP

# Remove any old full config symlink first
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace.conf

# Enable only the temporary HTTP-only config
sudo ln -sf /etc/nginx/sites-available/yuvro-ymarketplace-http-only.conf /etc/nginx/sites-enabled/yuvro-ymarketplace-http-only.conf

# Test and reload with HTTP-only config
sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx
echo "✓ HTTP-only config loaded for certificate validation"

# Request SSL certs for all YMarketplace domains
for d in "\${DOMAINS[@]}"; do
    [ -d "/etc/letsencrypt/live/\$d" ] && echo "✓ cert exists: \$d" && continue
    sudo certbot certonly --webroot --webroot-path /var/www/certbot \
        --non-interactive --agree-tos --email "$CERT_EMAIL" -d "\$d" 2>&1 \
        && echo "✓ cert issued: \$d" || echo "⚠ certbot failed: \$d"
done

# ── STAGE 2: Deploy full HTTPS config now that certs exist ─────────────────
# Copy the full HTTPS config
sudo cp /tmp/ymarketplace.conf /etc/nginx/sites-available/yuvro-ymarketplace.conf

# Remove temporary HTTP-only config symlink
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace-http-only.conf

# Enable the full HTTPS config
sudo ln -sf /etc/nginx/sites-available/yuvro-ymarketplace.conf /etc/nginx/sites-enabled/yuvro-ymarketplace.conf

# Test and reload with full HTTPS config
sudo nginx -t && sudo systemctl reload nginx && echo "✓ HTTPS config active" || echo "⚠ nginx test failed"

# Setup renewal cron
CRON="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
( sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON" ) | sudo crontab -
CERTBOT

    print_success "Nginx + SSL ready for YMarketplace"
}

ensure_infra_and_deploy "ymarketplace" "${1:-main}"
