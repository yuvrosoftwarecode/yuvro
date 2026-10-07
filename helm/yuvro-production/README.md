# Yuvro Production Helm Chart

Production-grade Helm chart for deploying Yuvro applications to AWS EKS.

## Overview

This chart deploys all 5 Yuvro applications + code executor service to a Kubernetes cluster using a single consolidated RDS database.

**Applications:**
- ycode - Learning platform backend
- ycampus - Campus management backend
- ylabs - Labs platform backend
- yhub - Hub service backend
- ymarketplace - Marketplace platform backend
- code-executor - Code execution service

## Architecture

```
Helm Release (yuvro)
├── Namespace: yuvro-production
├── Deployments (1-N replicas each)
│   ├── ycode-backend
│   ├── ycampus-backend
│   ├── ylabs-backend
│   ├── yhub-backend
│   ├── ymarketplace-backend
│   └── code-executor
├── Services (ClusterIP)
│   ├── ycode-backend → :80
│   ├── ycampus-backend → :80
│   ├── ylabs-backend → :80
│   ├── yhub-backend → :80
│   ├── ymarketplace-backend → :80
│   └── code-executor → :80
├── Secrets
│   └── yuvro-db-credentials
└── Config
    └── Environment variables from values.yaml
```

## Generic Templates

Templates are designed to be reusable across all applications:

### `deployment-backends.yaml`
- Generic template that deploys all 5 backend services
- Uses range loop over app list
- Respects enabled/disabled flags
- Configurable replicas, resources, and environment per app

### `services-backends.yaml`
- Generic template that creates services for all backends
- Creates ClusterIP services for internal communication
- Exposes on port 80, targets app HTTP port

### `deployment-code-executor.yaml`
- Dedicated template for code executor service
- Single replica by default
- Separate health check endpoint

### `service-code-executor.yaml`
- Service for code executor
- ClusterIP exposure

## Installation

### Prerequisites
- EKS cluster running
- kubectl configured
- Helm 3.10+
- Secrets created: `yuvro-db-credentials`

### Deploy All Applications
```bash
helm install yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --set global.database.host=prod-yuvro-db.example.com \
  --set global.database.masterUser=yuvro_admin \
  --set global.database.masterPassword=SecurePassword \
  --set global.environment=production
```

### Deploy Specific Applications
```bash
# Deploy only YCode and YLabs
helm install yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --set ycode.enabled=true \
  --set ycampus.enabled=false \
  --set ylabs.enabled=true \
  --set yhub.enabled=false \
  --set ymarketplace.enabled=false \
  --set codeExecutor.enabled=false \
  --set global.database.host=prod-yuvro-db.example.com \
  --set global.database.masterUser=yuvro_admin \
  --set global.database.masterPassword=SecurePassword
```

### Upgrade Deployment
```bash
helm upgrade yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --set ycode.enabled=true \
  --set ycode.replicaCount=3 \
  # ... other settings
```

## Configuration

### Global Settings (values.yaml)
```yaml
global:
  environment: production
  namespace: yuvro-production
  database:
    host: prod-yuvro-db.example.com
    port: 5432
    masterUser: yuvro_admin
    # password provided via secrets
```

### Per-Application Settings
Each app (ycode, ycampus, ylabs, yhub, ymarketplace) has:

```yaml
ycode:
  enabled: true                    # Enable/disable deployment
  replicaCount: 2                  # Number of pod replicas
  backend:
    image: yuvro/ycode-backend:latest
    port: 8000
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "500m"
    env:
      DEBUG: "false"
      DEPLOY_ENV: production
      APP_NAME: yuvro-ycode
      DATABASE_NAME: ycode
```

## Environment Variables

Each deployment receives:
- Database credentials from secret
- APP_NAME (e.g., yuvro-ycode)
- DATABASE_NAME (e.g., ycode)
- DEPLOY_ENV (production)
- DEBUG (false)

## Troubleshooting

### List Deployments
```bash
kubectl get deployments -n yuvro-production
kubectl get pods -n yuvro-production
```

### View Logs
```bash
kubectl logs -n yuvro-production -f deployment/ycode-backend
```

### Check Health
```bash
kubectl exec -n yuvro-production -it pod/ycode-backend-xxx -- \
  curl http://localhost:8000/api/health/
```

### Describe Deployment
```bash
kubectl describe deployment ycode-backend -n yuvro-production
```

## Dry Run
```bash
helm upgrade --install yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --dry-run \
  --debug \
  --set global.database.host=prod-yuvro-db.example.com \
  # ... other settings
```

## Rollback
```bash
# View release history
helm history yuvro -n yuvro-production

# Rollback to previous release
helm rollback yuvro -n yuvro-production

# Rollback to specific revision
helm rollback yuvro 5 -n yuvro-production
```

## Template Structure

```
templates/
├── _helpers.tpl                    # Template helpers and common functions
├── namespace.yaml                  # Kubernetes namespace
├── secrets-db.yaml                 # Database credentials secret
├── deployment-backends.yaml        # Generic deployments for all 5 apps
├── services-backends.yaml          # Generic services for all 5 apps
├── deployment-code-executor.yaml   # Code executor deployment
└── service-code-executor.yaml      # Code executor service
```

## Customization

### Add a New Backend Service
1. Add app configuration to `values.yaml`
2. Add app name to the list in `deployment-backends.yaml`:
   ```yaml
   {{- $apps := list "ycode" "ycampus" "ylabs" "yhub" "ymarketplace" "newapp" }}
   ```
3. Add database URL to `secrets-db.yaml`
4. Deploy as usual

### Modify Image Tags
```bash
helm upgrade yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --set imageTag=v1.2.3
```

## Release Notes

- **v1.0.0** (2026-10-07)
  - Initial production-ready chart
  - Generic templates for all 5 applications
  - Consolidated RDS database support
  - Kubernetes native deployments with health checks
  - Pod disruption budgets and auto-scaling

## Support

For issues or questions:
1. Check `.github/QUICK_START.md`
2. Review `infra/PROD_DEPLOYMENT_GUIDE.md`
3. Run health verification: `bash infra/scripts/utils/verify-prod-deployment.sh`
