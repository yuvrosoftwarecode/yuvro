#!/bin/bash
# Deploy YCampus only
# Usage: bash infra/scripts/deploy-ycampus.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# YCampus-specific nginx setup
setup_nginx() {
    local ip=$1 app="${2:-ycampus}"
    print_header "Setting up Nginx + SSL for YCampus"

    # Copy YCampus nginx config
    scp_ec2 "$PROJECT_ROOT/ycampus-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ycampus.conf"
    ssh_ec2 "ubuntu@$ip" "sudo cp /tmp/ycampus.conf /etc/nginx/sites-available/yuvro-ycampus.conf && sudo ln -sf /etc/nginx/sites-available/yuvro-ycampus.conf /etc/nginx/sites-enabled/"

    # YCampus domains
    local domains="campus-dev.yuvro.ai backend-campus-dev.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << CERTBOT
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# Remove default nginx config
sudo rm -f /etc/nginx/sites-enabled/default

# Reload nginx to verify config before certbot
sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx

# Request SSL certs for YCampus domains
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

    print_success "Nginx + SSL ready for YCampus"
}

ensure_infra_and_deploy "ycampus" "${1:-main}"