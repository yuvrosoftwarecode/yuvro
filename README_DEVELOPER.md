# Developer Deployment Guide

This guide covers deploying Yuvro services for development, testing, and production across different infrastructure types.

---

## Quick Start

```bash
# Initialize project (first time only)
make install

# Deploy all services
make deploy

# Deploy specific service
make deploy-ycode
make deploy-ycampus
make deploy-ylabs
make deploy-yhub
make deploy-ymarketplace
make deploy-code-executor

# Check status
make status

# View logs
make logs SERVICE=ycode-backend
```

---

## Deployment Environments

### 1. Local Development (`DEPLOY_ENV=local`)

Runs on Docker Desktop with local services.

#### Commands:
```bash
# Deploy all services
DEPLOY_ENV=local make deploy

# Deploy specific service
DEPLOY_ENV=local make deploy-ycode
```

#### URLs:
| Service | URL |
|---------|-----|
| YCode Frontend | http://localhost:3000 (via Service LoadBalancer) |
| YCode Backend | http://localhost:8000 (via Service LoadBalancer) |
| YCampus Frontend | http://localhost:3001 (via Service LoadBalancer) |
| YCampus Backend | http://localhost:8001 (via Service LoadBalancer) |
| YLabs Frontend | http://localhost:3002 (via Service LoadBalancer) |
| YLabs Backend | http://localhost:8002 (via Service LoadBalancer) |
| YHub Backend | http://localhost:8003 (via Service LoadBalancer) |
| YMarketplace Frontend | http://localhost:3004 (via Service LoadBalancer) |
| YMarketplace Backend | http://localhost:8004 (via Service LoadBalancer) |
| Code Executor | http://localhost:8009 (via Service LoadBalancer) |

**No port-forwarding needed!** Docker Desktop's built-in LoadBalancer support exposes services directly.

#### Accessing Services:

For services not directly exposed (like PostgreSQL, MinIO), use port-forwarding:

```bash
# PostgreSQL (for database management)
kubectl port-forward -n ycode svc/yuvro-postgresql-ycode 5432:5432

# MinIO (for storage management)
kubectl port-forward -n yuvro svc/yuvro-minio 9000:9000

# Prometheus (if deployed)
kubectl port-forward -n monitoring svc/prometheus-k8s 9090:9090

# Grafana (if deployed)
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

---

### 2. Kubernetes (Local) - Docker Desktop (`DEPLOY_INFRA_TYPE=k8s`)

Runs on local Kubernetes cluster (Docker Desktop, minikube).

#### Commands:
```bash
# Deploy all services
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy

# Deploy specific service
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-ycode
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-ycampus
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-ylabs
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-yhub
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-ymarketplace
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s make deploy-code-executor
```

#### URLs (via LoadBalancer):
Same as local development - services are automatically exposed via LoadBalancer on localhost.

#### Namespaces:
| Service | Namespace |
|---------|-----------|
| YCode | ycode |
| YCampus | ycampus |
| YLabs | ylabs |
| YHub | yhub |
| YMarketplace | ymarketplace |
| Code Executor | yuvro |
| MinIO | yuvro |

---

### 3. Production EKS (`DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks`)

Deploy to AWS EKS using GitHub Container Registry (GHCR).

#### Prerequisites:
```bash
# Install required tools
brew install kubectl helm

# Configure AWS CLI
aws configure

# Configure kubectl for EKS
aws eks update-kubeconfig --name yuvro-prod-cluster --region ap-south-1

# Verify cluster access
kubectl cluster-info
```

#### Commands:
```bash
# Deploy all services
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main GITHUB_TOKEN=<your-pat> make deploy

# Deploy specific service
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=infra_new GITHUB_TOKEN=<your-pat> make deploy-ycode
```

#### GitHub Token Setup:
1. Create GitHub Personal Access Token (PAT) with `write:packages` scope
2. Export the token:
   ```bash
   export GITHUB_TOKEN='ghp_xxxxxxxxxxxxx'
   export GITHUB_OWNER='yuvro'
   ```
3. Use in deployment commands

#### URLs:
| Service | URL |
|---------|-----|
| YCode Frontend | https://ycode.yourdomain.com |
| YCampus Frontend | https://ycampus.yourdomain.com |
| YLabs Frontend | https://ylabs.yourdomain.com |
| YHub | https://yhub.yourdomain.com |
| YMarketplace | https://ymarketplace.yourdomain.com |

---

### 4. Production ECS (`DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs`)

Deploy to AWS ECS.

#### Commands:
```bash
# Deploy all services
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs make deploy

# Deploy specific service
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs make deploy-ycode
```

---

### 5. Production EC2 (`DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2`)

Deploy to AWS EC2 instances.

#### Commands:
```bash
# Deploy all services
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2 make deploy

# Deploy specific service
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2 make deploy-ycode
```

---

## Full Environment × Infrastructure Matrix

| DEPLOY_ENV | DEPLOY_INFRA_TYPE | Command | URLs | Notes |
|------------|-------------------|---------|------|-------|
| local | local | `make deploy` | localhost:3000-3004 | Docker Desktop |
| local | k8s | `DEPLOY_INFRA_TYPE=k8s make deploy` | localhost (via port-forward) | Docker Desktop K8s |
| local | ec2 | `DEPLOY_ENV=dev DEPLOY_INFRA_TYPE=ec2 make deploy` | EC2 Public IP | Dev EC2 |
| prod | eks | `DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy` | yourdomain.com | Production EKS |
| prod | ecs | `DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs make deploy` | ELB DNS | Production ECS |
| prod | ec2 | `DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2 make deploy` | EC2 Public IP | Production EC2 |

---

## Common Commands

### Deployment
```bash
# Deploy all services
make deploy

# Deploy specific service
make deploy-ycode
make deploy-ycampus
make deploy-ylabs
make deploy-yhub
make deploy-ymarketplace
make deploy-code-executor

# Deploy common apps (executor, yhub, minio)
make deploy-common-apps
```

### Status & Logs
```bash
# Check deployment status
make status

# View service logs
make logs SERVICE=ycode-backend
make logs SERVICE=ycode-frontend
make logs SERVICE=yuvro-code-executor

# Get pods
kubectl get pods -n ycode
kubectl get pods -n ycampus
kubectl get pods -n yuvro
```

### Service-Specific Commands
```bash
# YCode backend
make backend-shell
make backend-test
make backend-format-fix
make backend-lint

# YCode frontend
make frontend-shell
make frontend-test
make frontend-format-fix
make frontend-lint

# Code executor
make executor-test
make executor-logs
```

---

## Environment Variables

### Local Development
- **Non-secrets**: `ycode-backend-api/.env.local`
- **Secrets**: `ycode-backend-api/.env.local-secrets` (gitignored)

### Production
- **Non-secrets**: `ycode-backend-api/.env.prod`
- **Secrets**: `ycode-backend-api/.env.prod-secrets` (from CI/CD)

### Environment Flow
```
DEPLOY_ENV=local
    ↓
Reads .env.local and .env.local-secrets
    ↓
Kompose generates ConfigMap/Secret
    ↓
Helm deploys to Kubernetes
    ↓
Pods receive env vars via ConfigMap
```

---

## Troubleshooting

### Pod Not Starting
```bash
# Check pod status
kubectl get pods -n <namespace>

# Check logs
kubectl logs -n <namespace> <pod-name>

# Describe pod for details
kubectl describe pod -n <namespace> <pod-name>
```

### Helm Issues
```bash
# List releases
helm list -n <namespace>

# Check release history
helm history ycode -n ycode

# Rollback
helm rollback ycode -n ycode
```

### Network Issues
```bash
# Check services
kubectl get svc -n <namespace>

# Check endpoints
kubectl get endpoints -n <namespace>

# Check ingress
kubectl get ingress -n <namespace>
```

### Environment Variables
```bash
# Check pod env
kubectl exec -n <namespace> <pod-name> -- env | grep DEPLOY_ENV

# Check ConfigMap
kubectl get configmap -n <namespace>
kubectl get configmap <configmap-name> -n <namespace> -o yaml
```

---

## CI/CD Pipeline

### GitHub Actions
- **Development**: `.github/workflows/dev_deploy_ec2.yml`
- **Production**: `.github/workflows/prod_deploy_release_ecs.yml`
- **Production**: `.github/workflows/prod_deploy_release_k8s.yml`

### Manual Deployment Flow
```bash
# 1. Push branch
git checkout infra_new
git push origin infra_new

# 2. Deploy
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=infra_new GITHUB_TOKEN=<token> make deploy

# 3. Verify
kubectl get pods -n ycode
kubectl logs -n ycode deployment/yuvro-ycode-backend
```

---

## Environment-Specific Configuration

### Local (DEPLOY_ENV=local)
- Database: PostgreSQL container
- Storage: MinIO (local)
- AI APIs: Development keys
- Debug: Enabled

### Production (DEPLOY_ENV=prod)
- Database: AWS RDS (production instance)
- Storage: AWS S3 (production bucket)
- AI APIs: Production keys (from secrets)
- Debug: Disabled

### Infrastructure Types

| Type | Description | Storage | Database | Use Case |
|------|-------------|---------|----------|----------|
| local | Docker Desktop | Local volumes | Container | Quick dev |
| k8s | Docker Desktop K8s | PV/PVC | Container | K8s testing |
| ec2 | AWS EC2 | EBS | RDS | Dev EC2 |
| ecs | AWS ECS | EFS | RDS | Production ECS |
| eks | AWS EKS | EBS | RDS | Production EKS |

---

## Notes

1. **Always check logs** after deployment if services fail
2. **Use environment-specific .env files** for credentials
3. **Keep GITHUB_TOKEN secure** - never commit to repo
4. **Test locally first** before deploying to production
5. **Use specific branches** for testing: `DEPLOY_BRANCH=feature_name`

---

## Getting Help

- Check service logs: `make logs SERVICE=<service>`
- Verify pods: `kubectl get pods -n <namespace>`
- Review deployment script: `infra/scripts/<infra_type>/deploy-<app>.sh`
- Check Helm values: `helm get values <release> -n <namespace>`
