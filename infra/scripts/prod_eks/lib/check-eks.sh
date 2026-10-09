#!/bin/bash
# Shared EKS cluster checks and setup

check_eks_cluster() {
  local app_name="${1:-Application}"
  
  # Check if kubectl is available
  if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    echo ""
    echo "ℹ️  To deploy to AWS EKS:"
    echo "   1. Install kubectl: brew install kubectl"
    echo "   2. Install AWS CLI: brew install awscli"
    echo "   3. Configure AWS credentials: aws configure"
    echo "   4. Update kubeconfig: aws eks update-kubeconfig --name yuvro-prod-eks --region ap-south-1"
    echo "   5. Then run: DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy-ycode"
    echo ""
    return 1
  fi

  # Check if helm is available
  if ! command -v helm &> /dev/null; then
    echo "❌ helm is not installed"
    echo ""
    echo "ℹ️  To use EKS deployment with Helm:"
    echo "   Install Helm: brew install helm"
    echo "   Then run: DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy-ycode"
    echo ""
    return 1
  fi

  # Check if AWS credentials are configured
  if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo ""
    echo "ℹ️  To fix this:"
    echo "   1. Run: aws configure"
    echo "   2. Enter your AWS Access Key ID and Secret Access Key"
    echo "   3. Set default region to: ap-south-1"
    echo ""
    return 1
  fi

  # Check if we can access the EKS cluster
  if ! kubectl cluster-info &> /dev/null; then
    echo "❌ EKS cluster not accessible"
    echo ""
    echo "ℹ️  To fix this:"
    echo "   1. Verify EKS cluster exists: aws eks describe-cluster --name yuvro-prod-eks --region ap-south-1"
    echo "   2. Update kubeconfig:"
    echo "      aws eks update-kubeconfig --name yuvro-prod-eks --region ap-south-1"
    echo "   3. Verify access:"
    echo "      kubectl cluster-info"
    echo ""
    return 1
  fi
  
  return 0
}

check_ghcr_access() {
  local github_token="${1:-}"
  
  if [ -z "$github_token" ]; then
    echo "❌ GitHub token not provided"
    echo ""
    echo "ℹ️  To use GitHub Container Registry (GHCR):"
    echo "   1. Create a GitHub Personal Access Token (PAT) with 'write:packages' scope:"
    echo "      https://github.com/settings/tokens/new"
    echo "   2. Set environment variable:"
    echo "      export GITHUB_TOKEN='your_token_here'"
    echo "   3. Then run: DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy-ycode"
    echo ""
    return 1
  fi
  
  # Verify token works by checking if we can authenticate
  if ! echo "$github_token" | docker login ghcr.io -u oauth2 --password-stdin &>/dev/null; then
    echo "❌ GitHub token invalid or expired"
    echo ""
    echo "ℹ️  To fix this:"
    echo "   1. Verify your GitHub token has 'write:packages' scope"
    echo "   2. Token may have expired - generate a new one:"
    echo "      https://github.com/settings/tokens/new"
    echo "   3. Export and retry:"
    echo "      export GITHUB_TOKEN='your_new_token'"
    echo "      DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy-ycode"
    echo ""
    return 1
  fi
  
  return 0
}

login_to_ghcr() {
  local github_token="${1:-}"
  local github_user="${2:-}"
  
  if [ -z "$github_token" ]; then
    echo "❌ GitHub token not provided"
    return 1
  fi
  
  echo "🔐 Authenticating to GitHub Container Registry (GHCR)..."
  
  # Login to GHCR using the token
  if echo "$github_token" | docker login ghcr.io -u oauth2 --password-stdin 2>/dev/null; then
    echo "✅ Authenticated to GHCR (ghcr.io)"
    return 0
  else
    echo "❌ Failed to login to GHCR"
    echo ""
    echo "ℹ️  Troubleshooting:"
    echo "   1. Verify token has 'write:packages' scope"
    echo "   2. Check token hasn't expired"
    echo "   3. Verify Docker daemon is running"
    echo ""
    return 1
  fi
}
