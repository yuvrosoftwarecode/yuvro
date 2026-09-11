#!/bin/bash
# Deploy ALL services
# Usage: bash infra/scripts/deploy-all.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"

# Source common functions
source "$SCRIPT_DIR/lib/deploy-common.sh"

# Nginx setup for all apps combined
setup_nginx() {
    local ip=$1 app="${2:-all}"
    print_header "Setting up Nginx + SSL for ALL apps"

    # Copy all nginx configs
    scp_ec2 "$PROJECT_ROOT/ycode-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ycode.conf"
    scp_ec2 "$PROJECT_ROOT/ycampus-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ycampus.conf"
    scp_ec2 "$PROJECT_ROOT/ylabs-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ylabs.conf"
    scp_ec2 "$PROJECT_ROOT/yhub-backend-api/nginx.ec2.conf" "ubuntu@$ip:/tmp/yhub.conf"
    scp_ec2 "$PROJECT_ROOT/yuvro-code-executer/nginx.ec2.conf" "ubuntu@$ip:/tmp/code-executor.conf"

    # Copy each config to sites-available
    ssh_ec2 "ubuntu@$ip" "sudo cp /tmp/ycode.conf /etc/nginx/sites-available/yuvro-ycode.conf && \
        sudo cp /tmp/ycampus.conf /etc/nginx/sites-available/yuvro-ycampus.conf && \
        sudo cp /tmp/ylabs.conf /etc/nginx/sites-available/yuvro-ylabs.conf && \
        sudo cp /tmp/yhub.conf /etc/nginx/sites-available/yuvro-yhub.conf && \
        sudo cp /tmp/code-executor.conf /etc/nginx/sites-available/yuvro-code-executor.conf && \
        sudo rm -f /etc/nginx/sites-enabled/default"

    # All domains
    local domains="code-dev.yuvro.ai backend-code-dev.yuvro.ai \
        campus-dev.yuvro.ai backend-campus-dev.yuvro.ai \
        dev.yuvrolabs.com backend-dev.yuvrolabs.com \
        backend-hub-dev.yuvro.ai \
        code-executer-dev.yuvro.ai"

    ssh_ec2 "ubuntu@$ip" bash << CERTBOT
DOMAINS=( $domains )
CERT_EMAIL="rohith@yuvro.ai"

# Reload nginx to verify config before certbot
sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx

# Request SSL certs for all domains
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

    print_success "Nginx + SSL ready for ALL apps"
}

# Deploy all apps
ensure_infra_and_deploy "all" "${1:-main}"