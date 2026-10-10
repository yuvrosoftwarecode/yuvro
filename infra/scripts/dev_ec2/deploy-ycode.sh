#!/bin/bash
# Deploy YCode only
# Usage: bash infra/scripts/deploy-ycode.sh [branch]
#   branch  Git branch to deploy (default: main)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# YCode-specific nginx setup
setup_nginx() {
    local ip=$1 app="${2:-ycode}"
    print_header "Setting up Nginx + SSL for YCode"

    # Copy YCode nginx config
    scp_ec2 "$PROJECT_ROOT/ycode-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ycode.conf"
    ssh_ec2 "ubuntu@$ip" "sudo cp /tmp/ycode.conf /etc/nginx/sites-available/yuvro-ycode.conf && sudo ln -sf /etc/nginx/sites-available/yuvro-ycode.conf /etc/nginx/sites-enabled/"

    # YCode domains
    local domains="code-dev.yuvro.ai backend-code-dev.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << CERTBOT
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# Remove default nginx config
sudo rm -f /etc/nginx/sites-enabled/default

# Reload nginx to verify config before certbot
sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx

# Request SSL certs for YCode domains
for d in "\${DOMAINS[@]}"; do
    [ -d "/etc/letsencrypt/live/\$d" ] && echo "✓ exists: \$d" && continue
    sudo certbot certonly --webroot --webroot-path /var/www/certbot \
        --non-interactive --agree-tos --email "$CERT_EMAIL" -d "\$d" 2>&1 \
        && echo "✓ cert: \$d" || echo "⚠ certbot failed: \$d"
done

# Final nginx reload with HTTPS configs
sudo nginx -t && sudo systemctl reload nginx && echo "✓ HTTPS config active" || echo "⚠ nginx error"
CRON="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
( sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON" ) | sudo crontab -
CERTBOT

    print_success "Nginx + SSL ready for YCode"
}

ensure_infra_and_deploy "ycode" "${1:-main}"