# Yuvro Deployment Architecture

This document describes the unified OpenTofu infrastructure-as-code deployment system for Yuvro applications.

## Overview

Yuvro uses a **separate infrastructure architecture** for dev and prod environments:

- **Development**: EC2 instance + Docker Compose + Consolidated RDS
- **Production**: AWS EKS Kubernetes cluster + Helm + Consolidated RDS

Both environments share the same OpenTofu modules and infrastructure code, but use **separate `main.tf` files** to maintain architectural clarity and avoid unnecessary complexity.

## Directory Structure

```
infra/opentofu/
├── modules/                          # Shared infrastructure modules
│   ├── security_groups/              # VPC security groups
│   ├── ec2_nodes/                    # EC2 instances
│   ├── rds/                          # RDS PostgreSQL database
│   ├── s3/                           # S3 buckets for uploads/logs
│   ├── iam/                          # IAM roles and service users
│   ├── cloudwatch/                   # CloudWatch logging
│   ├── eks/                          # EKS Kubernetes cluster
│   └── k8s_deployment/               # Kubernetes namespace, secrets, Helm release
│
├── dev/
│   ├── main.tf                       # Dev infrastructure (EC2 + Docker Compose)
│   ├── variables.tf                  # Dev-specific variables
│   ├── outputs.tf                    # Dev outputs
│   ├── terraform.tfvars              # Dev environment values
│   └── terraform.tfstate*            # State file (local)
│
├── prod/
│   ├── main.tf                       # Prod infrastructure (EKS + Kubernetes)
│   ├── variables.tf                  # Prod-specific variables
│   ├── outputs.tf                    # Prod outputs
│   ├── terraform.tfvars              # Prod environment values
│   └── terraform.tfstate*            # State file (local)
│
└── README.md                         # Old root-level docs (deprecate)
```

## Deployment Models

### Development Environment

**Architecture**: Single EC2 instance with Docker Compose

```
EC2 (t3.medium)
├── Docker Container: ycode-backend
├── Docker Container: ycampus-backend
├── Docker Container: ylabs-backend
├── Docker Container: yhub-backend
├── Docker Container: ymarketplace-backend
├── Docker Container: code-executor
├── Docker Container: ycode-frontend
├── Docker Container: ycampus-frontend
├── Docker Container: ylabs-frontend
├── Docker Container: ymarketplace-frontend
│
└── RDS PostgreSQL (db.t3.small)
    ├── ycode database
    ├── ycampus database
    ├── ylabs database
    ├── yhub database
    └── ymarketplace database
```

**Deployment**:
```bash
cd infra/opentofu/dev
tofu init
tofu plan
tofu apply

# OR use the unified script
bash infra/scripts/deploy-all.sh dev
```

**Cost**: ~$20-30/month (t3.medium EC2 + db.t3.small RDS)

### Production Environment

**Architecture**: EKS Kubernetes cluster with Helm

```
EKS Cluster (3 t3.large nodes, autoscale 2-5)
├── Namespace: yuvro-production
│   ├── Deployment: ycode-backend (2 replicas)
│   ├── Deployment: ycampus-backend (2 replicas)
│   ├── Deployment: ylabs-backend (2 replicas)
│   ├── Deployment: yhub-backend (2 replicas)
│   ├── Deployment: ymarketplace-backend (2 replicas)
│   ├── Deployment: code-executor (1 replica)
│   ├── Deployment: ycode-frontend (2 replicas)
│   ├── Deployment: ycampus-frontend (2 replicas)
│   ├── Deployment: ylabs-frontend (2 replicas)
│   ├── Deployment: ymarketplace-frontend (2 replicas)
│   ├── Services (10 total, matching deployments)
│   ├── Secret: yuvro-db-credentials
│   └── ConfigMaps (per-app configuration)
│
└── RDS PostgreSQL (db.t3.medium, Multi-AZ, 30-day backups)
    ├── ycode database
    ├── ycampus database
    ├── ylabs database
    ├── yhub database
    └── ymarketplace database
```

**Deployment**:
```bash
cd infra/opentofu/prod
tofu init
tofu plan
tofu apply

# OR use the unified script
bash infra/scripts/deploy-all.sh prod
```

**Cost**: ~$200-300/month (3x t3.large EC2 nodes + db.t3.medium RDS Multi-AZ)

## Unified Deployment Script

A single `deploy-all.sh` script handles both environments:

```bash
# Deploy dev (EC2 + Docker Compose)
bash infra/scripts/deploy-all.sh dev

# Deploy prod (EKS + Kubernetes)
bash infra/scripts/deploy-all.sh prod

# Show plan without applying
bash infra/scripts/deploy-all.sh prod --plan-only

# Deploy prod without database setup
bash infra/scripts/deploy-all.sh prod --skip-db-migration
```

The script:
1. Validates environment (dev or prod)
2. Changes to environment directory
3. Initializes OpenTofu
4. Runs `tofu plan` for review
5. Prompts for confirmation
6. Runs `tofu apply`
7. Outputs deployment details and next steps

## Shared Modules

### 1. Security Groups (`modules/security_groups/`)
- App security group (for EC2 and EKS nodes)
- RDS security group (database access)
- Ingress/egress rules for communication

### 2. EC2 Nodes (`modules/ec2_nodes/`)
- Provisions EC2 instances (dev only)
- User data for Docker setup
- Network configuration

### 3. RDS (`modules/rds/`)
- Consolidated PostgreSQL database
- Automated backups
- Multi-AZ option
- Parameter groups and options

### 4. S3 (`modules/s3/`)
- Application data bucket
- CORS configuration
- Upload/logs directories

### 5. IAM (`modules/iam/`)
- Service user for app access to AWS resources
- S3 bucket permissions
- CloudWatch log permissions

### 6. CloudWatch (`modules/cloudwatch/`)
- Centralized logging
- Log groups per environment
- CloudWatch alarms (optional)

### 7. EKS (`modules/eks/`)
- EKS cluster provisioning
- Node group management
- Security group rules
- IAM roles for cluster and nodes

### 8. Kubernetes Deployment (`modules/k8s_deployment/`)
- Kubernetes namespace
- Database credentials secret
- Helm release deployment
- Dynamic app enablement

## Variables and Configuration

### Dev Configuration (`dev/terraform.tfvars`)

```hcl
aws_region = "ap-south-1"
instance_type = "t3.medium"
instance_count = 1
db_instance_class = "db.t3.small"
backup_retention_days = 0
multi_az = false
```

### Prod Configuration (`prod/terraform.tfvars`)

```hcl
aws_region = "ap-south-1"
eks_instance_types = ["t3.large"]
eks_desired_size = 3
db_instance_class = "db.t3.medium"
backup_retention_days = 30
multi_az = true
```

### Overriding Variables

Use `-var` flag to override values:

```bash
cd infra/opentofu/prod
tofu apply -var="eks_desired_size=5" -var="db_instance_class=db.t3.large"
```

Or create additional `.tfvars` files:

```bash
tofu apply -var-file="terraform.tfvars" -var-file="custom-overrides.tfvars"
```

## State Management

By default, Terraform state is stored locally:
- Dev state: `infra/opentofu/dev/terraform.tfstate`
- Prod state: `infra/opentofu/prod/terraform.tfstate`

**For production, use remote state**:

Uncomment the backend configuration in main.tf:

```hcl
backend "s3" {
  bucket         = "yuvro-terraform-state"
  key            = "prod/terraform.tfstate"
  region         = "ap-south-1"
  encrypt        = true
  dynamodb_table = "terraform-locks"
}
```

Then run:
```bash
tofu init  # Migrate state to S3
```

## Deployment Workflows

### Initial Dev Setup

```bash
# 1. Deploy infrastructure
bash infra/scripts/deploy-all.sh dev

# 2. SSH into EC2 and clone repo
ssh -i <key-path> ec2-user@<public-ip>
git clone https://github.com/yuvro/yuvro-code.git
cd yuvro-code

# 3. Set up environment variables
cp .env.dev-example .env.dev

# 4. Start Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# 5. Run migrations
docker-compose -f docker-compose.dev.yml exec ycode-backend python manage.py migrate
```

### Initial Prod Deployment

```bash
# 1. Deploy infrastructure
bash infra/scripts/deploy-all.sh prod

# 2. Configure kubectl
aws eks update-kubeconfig --name yuvro-prod-cluster --region ap-south-1

# 3. Verify cluster
kubectl cluster-info
kubectl -n yuvro-production get pods

# 4. Check Helm release
helm list -n yuvro-production

# 5. View application logs
kubectl -n yuvro-production logs -f deployment/ycode-backend
```

### Scaling Production

Adjust `eks_desired_size` in `prod/terraform.tfvars`:

```hcl
eks_desired_size = 5  # Scale to 5 nodes
```

Then apply:
```bash
cd infra/opentofu/prod
tofu apply
```

### Enabling/Disabling Apps

Set `apps_enabled` in `prod/terraform.tfvars`:

```hcl
apps_enabled = {
  "ycode"        = true
  "ycampus"      = true
  "ylabs"        = false   # Disable YLabs
  "yhub"         = true
  "ymarketplace" = true
}
```

Then apply:
```bash
cd infra/opentofu/prod
tofu apply
```

## Secrets Management

### Database Credentials

Stored in `terraform.tfvars` as `db_master_password` (sensitive):

```hcl
db_master_password = "SecurePassword123!"
```

For production, use a secrets manager:

```bash
# Store secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name yuvro-prod-db-password \
  --secret-string "SecurePassword123!"

# Reference in Terraform (advanced pattern)
data "aws_secretsmanager_secret" "db_password" {
  name = "yuvro-prod-db-password"
}
```

### Kubernetes Secrets

Database credentials are automatically created in the `yuvro-db-credentials` secret by the `k8s_deployment` module. Access in the pod:

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: yuvro-db-credentials
        key: ycode-database-url
```

## Monitoring and Troubleshooting

### Dev Environment

```bash
# SSH into EC2
ssh -i <key-path> ec2-user@<public-ip>

# Check Docker containers
docker ps -a

# View logs
docker-compose -f docker-compose.dev.yml logs -f ycode-backend

# Database connection
psql -h <rds-host> -U yuvro_admin -d ycode
```

### Prod Environment

```bash
# Check cluster nodes
kubectl get nodes

# View deployments
kubectl -n yuvro-production get deployments

# Check pod status
kubectl -n yuvro-production get pods

# View pod logs
kubectl -n yuvro-production logs <pod-name>

# Check resource usage
kubectl -n yuvro-production top pods

# Describe pod for events
kubectl -n yuvro-production describe pod <pod-name>
```

### Common Issues

#### Dev: EC2 fails to launch
- Check VPC and subnets exist
- Verify key pair name is correct
- Check security group rules

#### Prod: EKS cluster creation hangs
- Check VPC has sufficient capacity
- Verify IAM permissions for EKS service
- Check CloudWatch logs for errors

#### Prod: Pods not starting
- Check image availability in registry
- Verify database credentials secret
- Check resource requests vs node capacity

## Cost Estimation

### Dev
- EC2 t3.medium: ~$15/month
- RDS db.t3.small: ~$15/month
- S3/Data transfer: ~$5/month
- **Total: ~$35/month**

### Prod
- EKS (3x t3.large): ~$150/month
- RDS db.t3.medium Multi-AZ: ~$80/month
- Data transfer/S3: ~$30/month
- **Total: ~$260/month**

## Migration from Dev to Prod

1. **Backup dev database**:
   ```bash
   pg_dump postgresql://user:pass@dev-host/dbname > backup.sql
   ```

2. **Restore to prod**:
   ```bash
   psql postgresql://user:pass@prod-host/dbname < backup.sql
   ```

3. **Deploy prod infrastructure**:
   ```bash
   bash infra/scripts/deploy-all.sh prod
   ```

4. **Verify pod connectivity** to prod RDS

## Next Steps

1. Configure AWS credentials: `aws configure`
2. Create EC2 key pairs: `aws ec2 create-key-pair --key-name yuvro-dev`
3. Deploy dev environment: `bash infra/scripts/deploy-all.sh dev`
4. Test Docker Compose setup
5. Deploy prod when ready: `bash infra/scripts/deploy-all.sh prod`

## References

- [Terraform Documentation](https://www.terraform.io/docs)
- [OpenTofu Documentation](https://opentofu.org/docs)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Helm Documentation](https://helm.sh/docs)
