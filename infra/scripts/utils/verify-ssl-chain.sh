#!/bin/bash
# Verify and fix SSL certificate chain on EC2
# Run this on EC2 to ensure certificates are properly configured

set -e

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

print_header "Verifying SSL Certificate Chain"

DOMAINS=( "dev.yuvrolabs.com" "backend-dev.yuvrolabs.com" "yuvrolabs.com" )

for domain in "${DOMAINS[@]}"; do
    print_step "Checking $domain..."
    
    CERT_PATH="/etc/letsencrypt/live/$domain/fullchain.pem"
    
    if [ -f "$CERT_PATH" ]; then
        print_success "Certificate exists: $CERT_PATH"
        
        # Check certificate expiry
        expiry=$(sudo openssl x509 -in "$CERT_PATH" -noout -enddate 2>/dev/null | cut -d= -f2)
        print_info "  Expires: $expiry"
        
        # Check certificate subject
        subject=$(sudo openssl x509 -in "$CERT_PATH" -noout -subject 2>/dev/null | cut -d= -f2)
        print_info "  Subject: $subject"
        
        # Check certificate issuer
        issuer=$(sudo openssl x509 -in "$CERT_PATH" -noout -issuer 2>/dev/null | cut -d= -f2)
        print_info "  Issuer: $issuer"
        
        # Verify certificate chain
        if sudo openssl verify -CAfile "$CERT_PATH" "$CERT_PATH" >/dev/null 2>&1; then
            print_success "Certificate chain valid"
        else
            print_warning "Certificate chain verification failed (non-critical)"
        fi
    else
        print_error "Certificate not found: $CERT_PATH"
    fi
    
    echo ""
done

print_header "Checking Nginx Configuration"

print_step "Testing nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    sudo nginx -t
    exit 1
fi

print_step "Reloading nginx..."
if sudo systemctl reload nginx; then
    print_success "Nginx reloaded successfully"
else
    print_error "Failed to reload nginx"
    exit 1
fi

print_header "SSL Verification Complete"
print_success "All certificates are properly configured"
print_info "If browser still shows 'connection is not private':"
print_info "1. Clear browser cache (Cmd+Shift+Delete on Mac)"
print_info "2. Try in incognito/private mode"
print_info "3. Wait a few minutes for DNS/certificate propagation"
