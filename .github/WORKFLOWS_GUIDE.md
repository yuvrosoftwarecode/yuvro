# GitHub Workflows Guide

This document describes all GitHub Actions workflows for Yuvro infrastructure and deployment.

## Workflow Organization

Workflows are organized by environment in dedicated subdirectories:

```
.github/workflows/
├── dev_ec2/                    # Development (EC2 + Docker Compose)
│   ├── deploy_ec2.yml          # Deploy Services to EC2
│   ├── deploy_infra.yml        # Infrastructure management (plan/apply/plan & apply/destroy)
│   └── setup_fixtures.yml      # Setup Test Fixtures
│
├── prod/                       # Production Shared Workflows
│   └── create_release.yml      # Create Production Release (GHCR)
│
├── prod_ecs/                   # Production ECS (Primary)
│   ├── deploy_infra_ecs.yml    # Deploy Infrastructure (plan/apply/plan & apply/destroy)
│   ├── deploy_release_ecs.yml  # Deploy Release to ECS
│   └── setup_fixtures.yml      # Setup Fixtures
│
├── prod_eks/                   # Production Kubernetes (Future)
│   ├── deploy_infra_k8s.yml    # Deploy Infrastructure (plan/apply/plan & apply/destroy)
│   └── deploy_release_k8s.yml  # Deploy Release to K8s
│
└── WORKFLOWS_GUIDE.md          # This guide
```

**Environment Naming:**
- `dev_ec2` - Development environment using EC2 + Docker Compose
- `prod` - Production shared workflows (release creation for both ECS and EKS)
- `prod_ecs` - Production environment using ECS (current primary)
- `prod_eks` - Production environment using Kubernetes (future alternative)

---

## Development Workflows

### Dev - Deploy Infrastructure (OpenTofu)
**File**: `.github/workflows/dev_ec2/deploy_infra.yml`
**Purpose**: Manage development OpenTofu infrastructure
**Trigger**: Manual workflow dispatch

#### Available Actions
- **plan** (default) - Preview infrastructure changes
- **apply** - Deploy infrastructure to AWS dev environment  
- **plan & apply** - Preview changes then immediately apply (5 second delay)
- **destroy** - Tear down dev infrastructure

#### Features
- AWS credential configuration (access key/secret)
- Database password from secrets
- OpenTofu initialization and execution
- Resource validation after deployment

#### Usage
```
1. Go to Actions → "Dev - Deploy Infrastructure (OpenTofu)"
2. Click "Run workflow"
3. Select action (plan/apply/destroy)
4. Review logs for results
```

#### Infrastructure Components
- RDS PostgreSQL database
- VPC and networking
- IAM roles and policies
- Development-specific configurations

---

### Dev - Deploy Services to EC2
**File**: `.github/workflows/dev_ec2/deploy_ec2.yml`
**Purpose**: Deploy services to EC2 dev environment
**Trigger**: Manual workflow dispatch

#### Available Actions
- Deploy YCode backend
- Deploy YCampus backend
- Deploy YLabs backend
- Deploy Code Executor

---

### Dev - Setup Test Fixtures
**File**: `.github/workflows/dev_ec2/setup_fixtures.yml`
**Purpose**: Load test data into dev databases
**Trigger**: Manual workflow dispatch

---

## Production Workflows

### Prod - Create Release
**File**: `.github/workflows/prod/create_release.yml`
**Purpose**: Create production releases with GitHub Container Registry (GHCR) images
**Trigger**: Manual workflow dispatch

#### Features
- GitHub Container Registry (GHCR) support
- Automatic or custom release notes generation
- Multi-service Docker image builds
- Parallel builds (up to 3 concurrent)
- GitHub Release creation with release notes
- All images tagged with version and "latest"

#### Container Registry
- **Registry**: GitHub Container Registry (GHCR)
- **URL**: `ghcr.io/${{ github.repository_owner }}/`
- **Services**: 10 Yuvro applications (backends, frontends, code executor)

#### Usage
```
1. Go to Actions → "Prod - Create Release"
2. Click "Run workflow"
3. Enter version in semantic format (e.g., v1.0.0)
4. Optional inputs:
   - Custom release notes (auto-generated from commits if empty)
   - Select specific services to build (default: all services)
5. Workflow will:
   - Create GitHub Release
   - Build Docker images
   - Push to GHCR
   - Generate summary
```

---

### Prod - Plan Infrastructure Changes (Integrated)
**Note**: Infrastructure planning is now integrated into deploy_infra workflows.
- Use `prod_ecs/deploy_infra_ecs.yml` with **plan** action for ECS
- Use `prod_eks/deploy_infra_k8s.yml` with **plan** action for Kubernetes

---

### Prod - Plan Infrastructure Changes
**File**: Integrated into deploy_infra workflows
**Purpose**: Infrastructure planning is now part of deploy_infra (plan, apply, plan & apply actions)
**Note**: Removed as separate workflow - planning is performed by deploy_infra workflows

---

### Prod - Create Release
**File**: `.github/workflows/prod/create_release.yml`
**Purpose**: Create production releases with GHCR container images
**Trigger**: Manual workflow dispatch
**Environment**: No special environment required

#### Features
- GitHub Container Registry (GHCR) support
- Automatic or custom release notes
- Multi-service build support
- Parallel image builds (up to 3)
- Auto-generated semantic versioning

#### Infrastructure Components
- **Container Registry**: GitHub Container Registry (GHCR)
- **Image Storage**: `ghcr.io/${{ github.repository_owner }}/`
- **Services**: 10 Yuvro services (backends, frontends, executor)

#### Usage
```
1. Go to Actions → "Prod - Create Release"
2. Click "Run workflow"
3. Enter version (e.g., v1.0.0)
4. Optional: Custom release notes, select specific services
5. Monitor build progress (parallel builds, up to 3 at a time)
6. Release published on GitHub and images pushed to GHCR
```

---

#### Features
- AWS OIDC authentication
- Database password from secrets or .env
- ECS cluster creation and management
- RDS database setup
- Application Load Balancer (ALB) configuration
- Post-deployment validation

#### Infrastructure Components
- **ECS Cluster**: Fargate-compatible, auto-scaling
- **RDS PostgreSQL**: Production-grade, Multi-AZ
- **ALB**: Application Load Balancer with target groups
- **VPC**: Isolated network environment
- **IAM**: Service roles and policies

#### Usage
```
1. Go to Actions → "Prod - Deploy Infrastructure (ECS)"
2. Click "Run workflow"
3. Select action:
   - plan: Preview changes (recommended first)
   - apply: Deploy to production
   - destroy: Remove infrastructure (use with caution)
4. Monitor execution (10-20 minutes typical)
```

---

### Prod - Deploy Infrastructure (K8s)
**File**: `.github/workflows/prod_eks/deploy_infra_k8s.yml`
**Purpose**: Manage production Kubernetes (EKS) infrastructure
**Trigger**: Manual workflow dispatch
**Environment**: `production` (requires approval)

#### Available Actions
- **plan** (default) - Preview K8s infrastructure changes
- **apply** - Deploy K8s infrastructure to AWS prod
- **plan & apply** - Preview changes then immediately apply (5 second delay)
- **destroy** - Tear down K8s infrastructure

#### Features
- AWS OIDC authentication
- Database password from secrets or .env
- EKS cluster creation (Kubernetes 1.28+)
- Multi-AZ node distribution
- RDS database setup with backups
- CloudWatch logging
- Post-deployment validation

#### Infrastructure Components
- **EKS Cluster**: Kubernetes 1.28+, 3 nodes
- **Worker Nodes**: t3.large, Multi-AZ
- **RDS PostgreSQL**: Production-grade, Multi-AZ
- **VPC**: Isolated network with public/private subnets
- **NAT Gateways**: For private subnet outbound access
- **IAM**: OIDC integration for GitHub Actions

#### Usage
```
1. Go to Actions → "Prod - Deploy Infrastructure (K8s)"
2. Click "Run workflow"
3. Select action (plan/apply/destroy)
4. Monitor execution (15-30 minutes typical)
```

---

### Prod - Create Release
**File**: `.github/workflows/prod_ecs/create_release.yml`
**Purpose**: Create production releases
**Trigger**: Manual workflow dispatch

#### Features
- Version tagging
- Release notes generation
- Docker image building

---

### Prod - Deploy Release to ECS
**File**: `.github/workflows/prod_ecs/deploy_release_ecs.yml`
**Purpose**: Deploy versioned services to ECS
**Trigger**: Manual workflow dispatch

#### Inputs
- `release_version`: Release tag to deploy (e.g., v1.0.0)
- `cluster_name`: ECS cluster (default: yuvro-prod-cluster)

---

### Prod - Deploy Release to K8s
**File**: `.github/workflows/prod_eks/deploy_release_k8s.yml`
**Purpose**: Deploy versioned services to Kubernetes
**Trigger**: Manual workflow dispatch

#### Inputs
- `release_version`: Release tag to deploy
- Optional: Namespace, replicas, etc.

---

---

## Deployment Scripts Organization

Deployment scripts are organized by environment in `infra/scripts/`:

```
infra/scripts/
├── dev_ec2/                    # Development EC2 deployment
│   ├── deploy-all.sh           # Deploy all services to dev
│   ├── deploy-ycode.sh         # Deploy YCode
│   ├── deploy-ycampus.sh       # Deploy YCampus
│   ├── deploy-ylabs.sh         # Deploy YLabs
│   ├── deploy-yhub.sh          # Deploy YHub
│   ├── deploy-ymarketplace.sh  # Deploy YMarketplace
│   ├── deploy-code-executor.sh # Deploy Code Executor
│   └── lib/                    # Shared libraries
│
├── prod_ecs/                   # Production ECS deployment
│   ├── deploy-all.sh           # Deploy all services to ECS
│   └── lib/                    # Shared libraries
│
├── prod_eks/                   # Production EKS/Kubernetes deployment
│   ├── deploy-all.sh           # Deploy all services to K8s
│   └── lib/                    # Shared libraries
│
├── lib/                        # Root level shared libraries
├── utils/                      # Utility scripts (migrations, verification)
└── README.md                   # Scripts documentation
```

**Workflow Integration:**

| Environment | Type | Workflow | Actions |
|---|---|---|---|
| dev_ec2 | EC2 + Docker | `.github/workflows/dev_ec2/deploy_ec2.yml` | deploy |
| dev_ec2 | OpenTofu | `.github/workflows/dev_ec2/deploy_infra.yml` | plan, apply, plan & apply, destroy |
| prod | Release | `.github/workflows/prod/create_release.yml` | build & push (GHCR) |
| prod_ecs | ECS Infra | `.github/workflows/prod_ecs/deploy_infra_ecs.yml` | plan, apply, plan & apply, destroy |
| prod_ecs | ECS Release | `.github/workflows/prod_ecs/deploy_release_ecs.yml` | deploy |
| prod_eks | K8s Infra | `.github/workflows/prod_eks/deploy_infra_k8s.yml` | plan, apply, plan & apply, destroy |
| prod_eks | K8s Release | `.github/workflows/prod_eks/deploy_release_k8s.yml` | deploy |

---

### Development Environment
- `DEPLOY_AWS_ACCESS_KEY_ID` - AWS access key for dev
- `DEPLOY_AWS_SECRET_ACCESS_KEY` - AWS secret key for dev
- `DEV_DB_MASTER_PASSWORD` - RDS master password (optional if in .env)

### Production Environment
- `PROD_AWS_ACCESS_KEY_ID` - AWS access key for prod
- `PROD_AWS_SECRET_ACCESS_KEY` - AWS secret key for prod
- `PROD_AWS_ROLE_TO_ASSUME` - IAM role ARN (for OIDC)
- `PROD_DB_MASTER_PASSWORD` - RDS master password (optional if in .env)

---

## Typical Workflows

### Deploying Infrastructure Changes

#### 1. Development (dev_ec2)
```
1. Make infrastructure changes to infra/opentofu/dev/
2. Test locally with: cd infra/opentofu/dev && tofu plan
3. Push to dev branch
4. Trigger: Actions → dev_ec2 → Deploy Infrastructure (OpenTofu) → apply
5. Verify: Check AWS console or workflow logs
```

#### 2. Production ECS (prod_ecs - Primary)
```
1. Make infrastructure changes to infra/opentofu/prod-ecs/
2. Create PR with changes (auto-plan via PR check if implemented)
3. Merge PR once approved
4. Trigger: Actions → prod_ecs → Deploy Infrastructure (ECS)
   - Select action:
     - plan: Preview changes (recommended first)
     - plan & apply: Show plan then apply immediately
     - apply: Just apply the plan directly
5. Monitor execution (10-20 minutes typical)
6. Verify deployment validation passed
```

#### 3. Production Kubernetes (prod_eks - Future)
```
Same as ECS but using:
- infra/opentofu/prod/ directory
- prod_eks → Deploy Infrastructure (K8s) workflow
- Execution time: 15-30 minutes
```

### Destroying Infrastructure

#### ⚠️ High-Risk Operation
```
1. For ECS: prod_ecs → Deploy Infrastructure (ECS) → action: destroy
2. For K8s: prod_eks → Deploy Infrastructure (K8s) → action: destroy
3. Confirm you understand the consequences:
   - All services will be terminated
   - Data may be lost (unless backed up)
   - Cannot be undone
4. Required approvals will be requested
```

---

## Platform Comparison

| Aspect | ECS | K8s (EKS) |
|--------|-----|-----------|
| **Current Status** | Primary (in use) | Future (planned) |
| **Cluster Type** | Fargate-based | EKS (managed K8s) |
| **Node Management** | Serverless | EC2 instances |
| **Scaling** | Automatic per task | Pod-based |
| **Cost** | Lower (pay per task) | Higher (reserved nodes) |
| **Complexity** | Lower | Higher |
| **Flexibility** | Limited | High |

---

## Monitoring Deployments

### Real-Time Monitoring
1. Go to Actions tab
2. Select running workflow
3. Click on `deploy-infra-ecs` or `deploy-infra` job
4. View live logs

### Post-Deployment Checks
- ECS: AWS Console → ECS → Clusters → yuvro-prod-cluster
- K8s: `kubectl get all -n yuvro`
- RDS: AWS Console → RDS → Databases

### Common Outputs
```
✅ Infrastructure Outputs:
- ECS Cluster Name: yuvro-prod-cluster
- RDS Instance: yuvro-prod-db
- ALB DNS: yuvro-prod-alb-123456.ap-south-1.elb.amazonaws.com
- EKS Endpoint: https://abc123.eks.ap-south-1.amazonaws.com
```

---

## Troubleshooting

### Authentication Failures
- Verify AWS secrets are correct and not expired
- For OIDC: Check IAM role trust relationship
- Check GitHub organization/repo matches OIDC provider config

### Infrastructure Already Exists
- Check AWS console for existing resources
- Consider importing resources into state
- Or destroy and recreate

### State Lock Issues
- OpenTofu state may be locked by another operation
- Wait for other operation to complete
- Or manually unlock if safe

### Database Password Issues
- Ensure password meets requirements (8+ chars, mixed case)
- Check password doesn't contain incompatible characters (/@"')
- Verify secret is not expired

---

## Best Practices

1. **Always Plan First**
   - Run plan before apply to review changes
   - Check for unexpected resource modifications

2. **Use Environment Approvals**
   - Production changes require approval
   - Review workflow logs before approving

3. **Backup Before Destroy**
   - Create RDS snapshots before destruction
   - Export Kubernetes configurations

4. **Monitor Deployments**
   - Watch workflow logs in real-time
   - Verify post-deployment validation passes

5. **Document Changes**
   - Update INFRASTRUCTURE_SUMMARY.md
   - Record configuration changes
   - Note any manual interventions

---

## Related Documentation

- [Production Deployment Guide](infra/PRODUCTION_DEPLOYMENT.md)
- [Infrastructure Variables](infra/opentofu/VARIABLES.md)
- [Infrastructure Summary](INFRASTRUCTURE_SUMMARY.md)
- [OpenTofu Deployment Summary](OPENTOFU_DEPLOYMENT_SUMMARY.md)

