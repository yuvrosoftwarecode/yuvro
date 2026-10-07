#!/bin/bash
# Setup HTTPS certificates for production YLabs domains
# Run this on EC2 instance after DNS records are configured
# Usage: bash setup-ssl-production-ylabs.sh

set -e

EC2_IP="${1:-3.108.115.67}"
DOMAINS="yuvrolabs.com"
CERT_EMAIL="rohith@yuvro.ai"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_step() { echo -e "${BOLD}› $1${NC}"; }

print_header "Setup HTTPS Certificates for Production YLabs Domains"

print_info "EC2 IP: $EC2_IP"
print_info "Domains: $DOMAINS"
echo ""

# Verify DNS is set up
print_step "Verifying DNS records..."
for domain in $DOMAINS; do
    dns_ip=$(dig +short A $domain | tail -1)
    if [ "$dns_ip" = "$EC2_IP" ]; then
        print_success "DNS resolved: $domain → $EC2_IP"
    else
        print_error "DNS NOT configured for $domain"
        print_info "  Expected: $EC2_IP"
        print_info "  Got: $dns_ip"
        echo ""
        echo "Please set up DNS records before proceeding:"
        echo "  $domain A $EC2_IP"
        exit 1
    fi
done

echo ""
print_header "Requesting SSL Certificates"

# SSH command to run on EC2
ssh -i ~/.ssh/yuvro-dev.pem ubuntu@$EC2_IP bash << 'CERTBOT_SCRIPT'
set -e

DOMAINS=( yuvrolabs.com )
CERT_EMAIL="rohith@yuvro.ai"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_step() { echo -e "${BOLD}› $1${NC}"; }

# Request SSL certs for production domains
for d in "${DOMAINS[@]}"; do
    print_step "Requesting certificate for $d..."
    
    if [ -d "/etc/letsencrypt/live/$d" ]; then
        print_success "Certificate already exists for $d"
        continue
    fi
    
    if sudo certbot certonly --webroot --webroot-path /var/www/certbot \
        --non-interactive --agree-tos --email "$CERT_EMAIL" -d "$d" 2>&1; then
        print_success "Certificate issued: $d"
    else
        print_error "Failed to issue certificate for $d"
        exit 1
    fi
done

print_info "All certificates requested successfully"
CERTBOT_SCRIPT

echo ""
print_header "Next Steps"

print_step "Update nginx configuration..."
print_info "1. Uncomment production domain blocks in ylabs-web/nginx.ec2.conf"
print_info "2. Commit and push changes to market-deploy2"
print_info "3. Re-run deployment:"
print_info "   DEPLOY_ENV=dev DEPLOY_BRANCH=market-deploy2 make deploy-ylabs"
print_info ""
print_info "Or manually on EC2:"
print_info "   sudo nginx -t && sudo systemctl reload nginx"

echo ""
print_success "SSL certificates ready for yuvrolabs.com and backend-yuvrolabs.com!"
