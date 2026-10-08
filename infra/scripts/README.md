# Infrastructure Deployment Scripts

This directory contains deployment scripts organized by environment and infrastructure type.

## Directory Structure

```
infra/scripts/
├── dev_ec2/              # Development EC2 deployment scripts
│   ├── deploy-all.sh     # Deploy all services to dev EC2
│   ├── deploy-ycode.sh   # Deploy YCode backend + frontend
│   ├── deploy-ycampus.sh # Deploy YCampus backend + frontend
│   ├── deploy-ylabs.sh   # Deploy YLabs backend + frontend
│   ├── deploy-yhub.sh    # Deploy YHub backend + frontend
│   ├── deploy-ymarketplace.sh # Deploy YMarketplace backend + frontend
│   ├── deploy-code-executor.sh # Deploy code executor service
│   └── lib/              # Shared libraries (deploy-common.sh)
│
├── prod_ecs/             # Production ECS deployment scripts
│   ├── deploy-all.sh     # Deploy all services to ECS cluster
│   └── lib/              # Shared libraries
│
├── prod_eks/             # Production EKS/Kubernetes deployment scripts
│   ├── deploy-all.sh     # Deploy all services to EKS cluster via Helm
│   └── lib/              # Shared libraries
│
├── lib/                  # Shared libraries (root level)
│   ├── deploy-common.sh  # Common deployment functions
│   └── deploy-common-k8s.sh # Kubernetes-specific functions
│
├── utils/                # Utility scripts
│   ├── migrate-*.sh      # Database migration utilities
│   ├── provision-*.sh    # Infrastructure provisioning utilities
│   ├── verify-*.sh       # Verification and validation utilities
│   └── *.py              # Python utilities
│
└── README.md             # This file
```

## Environments

### Development: EC2 + Docker Compose (dev_ec2)

Deploys services to a single EC2 instance with Docker Compose.

**Services:**
- Individual application deployments (ycode, ycampus, ylabs, yhub, ymarketplace)
- Code executor service
- Unified deployment script (deploy-all.sh)

**Infrastructure:** `infra/opentofu/dev/`
**Workflows:** `.github/workflows/dev/`

**Usage:**
```bash
# Deploy all services
bash infra/scripts/dev_ec2/deploy-all.sh main

# Deploy specific service
bash infra/scripts/dev_ec2/deploy-ycode.sh main

# Deploy to specific branch
bash infra/scripts/dev_ec2/deploy-ylabs.sh develop
```

### Production: ECS (prod_ecs)

Deploys services to AWS ECS cluster (container orchestration).

**Services:**
- All Yuvro applications as ECS services
- Task definitions and services
- Auto-scaling groups
- Load balancers

**Infrastructure:** `infra/opentofu/prod/ecs/`
**Workflows:** `.github/workflows/prod/deploy_release_ecs.yml`

**Usage:**
```bash
# Deploy all services
bash infra/scripts/prod_ecs/deploy-all.sh all deploy

# Deploy specific service
bash infra/scripts/prod_ecs/deploy-all.sh ycode deploy

# Rollback deployment
bash infra/scripts/prod_ecs/deploy-all.sh ycode rollback
```

### Production: EKS/Kubernetes (prod_eks)

Deploys services to AWS EKS cluster using Helm charts.

**Services:**
- All Yuvro applications as Kubernetes deployments
- Helm releases
- StatefulSets for databases
- Ingress controllers
- Service mesh (optional)

**Infrastructure:** `infra/opentofu/prod/eks/`
**Helm Charts:** `helm/yuvro-production/`
**Workflows:** `.github/workflows/prod/deploy_release_k8s.yml`

**Usage:**
```bash
# Deploy all services
bash infra/scripts/prod_eks/deploy-all.sh all deploy

# Upgrade specific service
bash infra/scripts/prod_eks/deploy-all.sh ycode upgrade

# Rollback deployment
bash infra/scripts/prod_eks/deploy-all.sh ycode rollback
```

## Shared Libraries

### `lib/deploy-common.sh`
Common functions for all deployments:
- SSH/SCP operations
- Color output helpers
- Error handling
- AWS credential setup

### `lib/deploy-common-k8s.sh`
Kubernetes-specific functions:
- kubectl operations
- Helm chart management
- Namespace and RBAC setup
- Monitoring and logging setup

## Utility Scripts

Located in `utils/`, these scripts handle common tasks:

- **Database Migration**
  - `migrate-to-consolidated-db.sh` - Consolidate databases to single RDS
  - `migrate-dev-to-prod.sh` - Migrate data from dev to production
  - `compare-db-migration.sh` - Compare database schemas

- **Infrastructure Provisioning**
  - `provision-infra.sh` - One-time infrastructure setup
  - `install-postgres-15.sh` - Install PostgreSQL 15 locally

- **Verification & Validation**
  - `verify-migration-status.sh` - Check migration status
  - `verify-prod-deployment.sh` - Verify production deployment health
  - `validate-rds-consolidation.sh` - Validate RDS consolidation

- **Certificate Management**
  - `setup-ssl-production-ylabs.sh` - Configure SSL certificates
  - `verify-ssl-chain.sh` - Verify SSL certificate chains
  - `fix-rds-ssl-*.sh` - Fix RDS SSL connection issues

- **Fixtures & Testing**
  - `runFixtures.sh` - Load test data into databases
  - `create-yuvro-admin-user.sh` - Create admin user

## Workflow Integration

Deployment scripts are called from GitHub Actions workflows:

| Environment | Infrastructure | Workflow | Script |
|---|---|---|---|
| Dev | EC2 + Docker | `.github/workflows/dev/deploy_ec2.yml` | `infra/scripts/dev_ec2/deploy-*.sh` |
| Dev | OpenTofu | `.github/workflows/dev/deploy_infra.yml` | OpenTofu |
| Prod | ECS | `.github/workflows/prod/deploy_release_ecs.yml` | `infra/scripts/prod_ecs/deploy-*.sh` |
| Prod | ECS Infrastructure | `.github/workflows/prod/deploy_infra_ecs.yml` | OpenTofu |
| Prod | EKS | `.github/workflows/prod/deploy_release_k8s.yml` | `infra/scripts/prod_eks/deploy-*.sh` |
| Prod | EKS Infrastructure | `.github/workflows/prod/deploy_infra_k8s.yml` | OpenTofu |

## Adding New Deployment Scripts

When adding a new service or deployment script:

1. Place the script in the appropriate environment directory
2. Use the shared library functions from `lib/`
3. Follow naming convention: `deploy-<service>.sh`
4. Include header comments with usage instructions
5. Use color output for better readability
6. Add proper error handling

Example:
```bash
#!/bin/bash
# Deploy YNewService
# Usage: bash infra/scripts/dev_ec2/deploy-ynewservice.sh [branch]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source common functions
source "$SCRIPT_DIR/lib/deploy-common.sh"

# Your deployment logic here
```

## Environment Variables

Each deployment reads from environment-specific `.env` files:

- `ycode-backend-api/.env.dev-secrets` (dev)
- `ycode-backend-api/.env.prod-secrets` (production)

These files contain:
- `DB_MASTER_PASSWORD`
- `AWS_REGION`
- `ECS_CLUSTER_NAME` (prod_ecs)
- `EKS_CLUSTER_NAME` (prod_eks)
- Other service-specific credentials

## Troubleshooting

### SSH Connection Issues
- Verify EC2 key pair is configured in `~/.ssh/`
- Check security groups allow SSH (port 22)
- Ensure EC2 instance has public IP assigned

### Docker Deployment Failures
- Verify Docker daemon is running on EC2
- Check Docker Compose version compatibility
- Review logs: `docker compose logs <service>`

### ECS Deployment Failures
- Verify AWS credentials and IAM permissions
- Check ECS cluster is running and accessible
- Review task definition and service configuration

### EKS Deployment Failures
- Verify kubectl is configured and authenticated
- Check EKS cluster is running and accessible
- Review Helm chart values and Kubernetes manifests
- Check pod logs: `kubectl logs <pod-name> -n yuvro-production`

## References

- OpenTofu Configuration: `infra/opentofu/`
- Helm Charts: `helm/`
- GitHub Workflows: `.github/workflows/`
- Infrastructure Documentation: `INFRASTRUCTURE_SUMMARY.md`, `OPENTOFU_DEPLOYMENT_SUMMARY.md`
