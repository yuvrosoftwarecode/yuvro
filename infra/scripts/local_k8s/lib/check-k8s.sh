#!/bin/bash
# Shared Kubernetes cluster checks and setup

check_k8s_cluster() {
  local app_name="${1:-Application}"
  
  # Check if kubectl is available
  if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    echo ""
    echo "ℹ️  To use local k8s deployment:"
    echo "   1. Install kubectl: brew install kubectl"
    echo "   2. Enable Kubernetes in Docker Desktop settings OR install minikube"
    echo "   3. Then run: DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-ycode"
    echo ""
    return 1
  fi

  # Check if we can access the cluster
  if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Kubernetes cluster not accessible"
    echo ""
    echo "ℹ️  To fix this:"
    echo "   Option 1: Enable Kubernetes in Docker Desktop"
    echo "     - Open Docker Desktop → Settings → Kubernetes → Enable Kubernetes"
    echo "     - Wait for cluster to start, then retry"
    echo ""
    echo "   Option 2: Use minikube"
    echo "     - Install: brew install minikube"
    echo "     - Start: minikube start --driver=docker"
    echo "     - Then retry: DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-ycode"
    echo ""
    echo "   Option 3: Use Docker Compose instead (recommended for local dev)"
    echo "     - DEPLOY_ENV=local DEPLOY_INFRA_TYPE=local make deploy-ycode"
    echo ""
    return 1
  fi
  
  return 0
}
