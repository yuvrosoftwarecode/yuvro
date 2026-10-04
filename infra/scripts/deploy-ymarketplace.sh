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

    # Copy the ymarketplace nginx config blocks
    scp_ec2 "$PROJECT_ROOT/ymarketplace-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ymarketplace.conf"

    # YMarketplace domains
    local domains="marketplace-dev.yuvro.ai marketplace-backend-dev.yuvro.ai marketplace.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << CERTBOT
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# Remove any stale separate marketplace config files created by previous attempts
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace.conf
sudo rm -f /etc/nginx/sites-enabled/yuvro-ymarketplace-http.conf
sudo rm -f /etc/nginx/sites-available/yuvro-ymarketplace-http.conf

# Append marketplace blocks to the main yuvro-dev config if not already present
if ! grep -q "marketplace-dev.yuvro.ai" /etc/nginx/sites-available/yuvro-dev 2>/dev/null; then
    sudo bash -c 'cat /tmp/ymarketplace.conf >> /etc/nginx/sites-available/yuvro-dev'
    echo "✓ appended marketplace blocks to yuvro-dev"
else
    echo "✓ marketplace blocks already in yuvro-dev"
fi

# Make sure the main config is enabled
sudo ln -sf /etc/nginx/sites-available/yuvro-dev /etc/nginx/sites-enabled/yuvro-dev 2>/dev/null || true

# Request SSL certs — skip domains without DNS
for d in "\${DOMAINS[@]}"; do
    if [ -d "/etc/letsencrypt/live/\$d" ]; then
        echo "✓ cert exists: \$d"
    elif ! host "\$d" >/dev/null 2>&1; then
        echo "⚠ skipping \$d — no DNS record yet"
    else
        sudo certbot certonly --webroot --webroot-path /var/www/certbot \
            --non-interactive --agree-tos --email "$CERT_EMAIL" -d "\$d" \
            && echo "✓ cert issued: \$d" \
            || echo "⚠ certbot failed: \$d"
    fi
done

# Test config and restart/reload nginx
sudo nginx -t && {
    sudo systemctl is-active nginx && sudo systemctl reload nginx || sudo systemctl restart nginx
    echo "✓ nginx active"
} || {
    echo "❌ nginx config error — check /etc/nginx/sites-available/yuvro-dev"
    sudo nginx -t
    exit 1
}

# Renewal cron (idempotent)
(sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | sudo crontab -
echo "✓ certbot renewal cron set"
CERTBOT

    print_success "Nginx + SSL ready for YMarketplace"
}

ensure_infra_and_deploy "ymarketplace" "${1:-main}"
