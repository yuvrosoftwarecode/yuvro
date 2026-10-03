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

    # Use the parent-repo nginx config (has all three domains with proper HTTPS blocks)
    scp_ec2 "$PROJECT_ROOT/ymarketplace-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ymarketplace.conf"
    ssh_ec2 "ubuntu@$ip" "sudo cp /tmp/ymarketplace.conf /etc/nginx/sites-available/yuvro-ymarketplace.conf && \
        sudo ln -sf /etc/nginx/sites-available/yuvro-ymarketplace.conf /etc/nginx/sites-enabled/yuvro-ymarketplace.conf"

    # All three domains
    local domains="marketplace-dev.yuvro.ai marketplace-backend-dev.yuvro.ai marketplace.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << CERTBOT
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# Ensure certbot + nginx are installed
command -v certbot >/dev/null 2>&1 || sudo apt-get install -y certbot python3-certbot-nginx -q
command -v nginx   >/dev/null 2>&1 || sudo apt-get install -y nginx -q
sudo mkdir -p /var/www/certbot

# Remove default nginx config to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# First pass: serve HTTP only so certbot webroot challenge works
# Strip SSL blocks by using a plain HTTP config for initial cert issuance
sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx

# Request SSL certs for each domain
for d in "\${DOMAINS[@]}"; do
    if [ -d "/etc/letsencrypt/live/\$d" ]; then
        echo "✓ cert already exists: \$d"
    else
        sudo certbot certonly --webroot --webroot-path /var/www/certbot \
            --non-interactive --agree-tos --email "$CERT_EMAIL" -d "\$d" 2>&1 \
            && echo "✓ cert issued: \$d" \
            || echo "⚠ certbot failed for \$d (check DNS points to this server)"
    fi
done

# Reload nginx with full HTTPS config now that certs exist
sudo nginx -t && sudo systemctl reload nginx && echo "✓ HTTPS config active" || { echo "⚠ nginx config error:"; sudo nginx -t; }

# Auto-renew cron (idempotent)
CRON="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
( sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "\$CRON" ) | sudo crontab -
echo "✓ certbot renewal cron set"
CERTBOT

    print_success "Nginx + SSL ready for YMarketplace"
}

ensure_infra_and_deploy "ymarketplace" "${1:-main}"
