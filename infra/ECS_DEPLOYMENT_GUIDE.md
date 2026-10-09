# ECS Deployment Guide

This guide covers deploying the Yuvro platform to AWS ECS for production use.

## Overview

The Yuvro infrastructure now supports both **EKS (Kubernetes)** and **ECS (container orchestration)** for production deployments. Both share the same database, storage, and security infrastructure.

### Infrastructure Comparison

| Aspect | EKS | ECS |
|--------|-----|-----|
| **Orchestration** | Kubernetes | AWS-native ECS |
| **Deployment Method** | Helm charts | Docker Compose / AWS APIs |
| **Auto Scaling** | Kubernetes HPA | EC2 Auto Scaling Group |
| **Learning Curve** | Steep | Gentle |
| **AWS Integration** | Deep (ALB, IAM, etc.) | Native AWS service |
| **Best For** | Large teams, complex setups | Simpler, AWS-focused deployments |

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **OpenTofu/Terraform** installed (`brew install opentofu`)
3. **AWS CLI** configured (`aws configure`)
4. **Git** with access to the Yuvro repository
5. **Docker** (for building images, optional if using GHCR)

### AWS Permissions Required

Your IAM user/role must have permissions for:
- ECS (cluster, services, tasks)
- EC2 (instances, security groups, launch templates, autoscaling)
- RDS (database)
- VPC (networking)
- IAM (roles and policies)
- CloudWatch (logs)
- S3 (bucket creation)

## Step 1: Infrastructure Setup (One-Time)

### 1.1 Provision ECS Cluster and Shared Resources

This creates the ECS cluster, VPC, RDS database, and supporting infrastructure.

```bash
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs make deploy-infra
```

**What this does:**
1. Initializes OpenTofu in `infra/opentofu/prod/`
2. Plans infrastructure changes using `prod-ecs.tfvars`
3. Asks for confirmation before applying
4. Creates (if not exists):
   - VPC with public/private subnets
   - RDS PostgreSQL database (prod-yuvro-db)
   - ECS cluster (yuvro-prod-ecs-cluster)
   - EC2 Auto Scaling Group
   - Security groups and IAM roles
   - CloudWatch log group

**Expected time:** 15-30 minutes (mostly RDS creation)

### 1.2 Verify Infrastructure

After infrastructure deployment completes:

```bash
# Verify ECS cluster exists
aws ecs describe-clusters --clusters yuvro-prod-ecs-cluster --region ap-south-1

# Check EC2 instances in cluster
aws ec2 describe-instances --filters "Name=tag:Name,Values=*yuvro-prod-ecs*" --region ap-south-1

# View Auto Scaling Group
aws autoscaling describe-auto-scaling-groups --region ap-south-1 | grep yuvro-prod-ecs

# Check RDS database
aws rds describe-db-instances --db-instance-identifier prod-yuvro-db --region ap-south-1
```

### 1.3 Database Initialization

The RDS database is created but empty. The first deployment will run migrations automatically, or you can initialize manually:

```bash
# Run migrations (will be done automatically during first deployment)
# See Step 2 for details
```

## Step 2: Deploy Applications to ECS

### 2.1 Deploy All Applications

Deploy all Yuvro applications (YCode, YCampus, YLabs, YHub, YMarketplace, Code Executor):

```bash
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs DEPLOY_BRANCH=main make deploy
```

This runs the deployment scripts in `infra/scripts/prod_ecs/`:
- `deploy-ycode.sh`
- `deploy-ycampus.sh`
- `deploy-ylabs.sh`
- `deploy-yhub.sh`
- `deploy-ymarketplace.sh`
- `deploy-code-executor.sh`

Each script:
1. Reads from `{app}-backend-api/.env.prod` and `{app}-backend-api/.env.prod-secrets`
2. Registers ECS task definitions
3. Creates ECS services
4. Monitors deployment status

**Expected time:** 5-10 minutes

### 2.2 Deploy Individual Application

Deploy a single application:

```bash
# YCode only
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs DEPLOY_BRANCH=main make deploy-ycode

# YCampus only
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs DEPLOY_BRANCH=main make deploy-ycampus

# Code Executor only
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs DEPLOY_BRANCH=main make deploy-code-executor
```

### 2.3 Verify Deployment

Check deployment status:

```bash
# List all ECS services
aws ecs list-services --cluster yuvro-prod-ecs-cluster --region ap-south-1

# Describe a specific service
aws ecs describe-services \
  --cluster yuvro-prod-ecs-cluster \
  --services ycode-backend \
  --region ap-south-1

# View running tasks
aws ecs list-tasks --cluster yuvro-prod-ecs-cluster --region ap-south-1

# Check task status
aws ecs describe-tasks \
  --cluster yuvro-prod-ecs-cluster \
  --tasks <task-arn> \
  --region ap-south-1
```

### 2.4 View Application Logs

Logs are sent to CloudWatch in log group `/ecs/yuvro-prod-ecs-cluster`:

```bash
# View recent logs (all services)
aws logs tail /ecs/yuvro-prod-ecs-cluster --follow --region ap-south-1

# View logs for specific service
aws logs tail /ecs/yuvro-prod-ecs-cluster --log-stream-name-pattern ycode-backend --follow --region ap-south-1

# View specific time range
aws logs tail /ecs/yuvro-prod-ecs-cluster \
  --since 10m \
  --region ap-south-1
```

## Environment Configuration

### Backend Environment Files

Each app needs `.env.prod` and `.env.prod-secrets` files:

**Location:** `{app}-backend-api/.env.prod` and `.env.prod-secrets`

**Example for yc-backend-api/.env.prod:**
```bash
DEPLOY_ENV=prod
DEBUG=False
DATABASE_URL=postgresql://yuvro_admin:PASSWORD@prod-yuvro-db.xxxxx.rds.amazonaws.com:5432/ycode
REDIS_URL=redis://...
SECRET_KEY=...
ALLOWED_HOSTS=*.yuvro.ai
CORS_ALLOWED_ORIGINS=https://*.yuvro.ai,https://yuvro.ai
AI_PROVIDER=openai
```

**Example for yc-backend-api/.env.prod-secrets:**
```bash
DB_PASSWORD=your-secure-password
SECRET_KEY=your-django-secret-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### Frontend Environment Variables

Frontends read from `{app}-web/.env`:

**Example for yc-web/.env:**
```bash
VITE_API_URL=https://api.ycode.yuvro.ai
VITE_APP_NAME=YCode
```

## Scaling and Configuration

### Auto Scaling

The ECS cluster uses EC2 Auto Scaling. Adjust capacity:

```bash
# Update Auto Scaling Group desired capacity
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name yuvro-prod-ecs-asg \
  --desired-capacity 4 \
  --region ap-south-1
```

Or update via OpenTofu:

```bash
# Edit infra/opentofu/prod-ecs.tfvars
# Change: ecs_asg_desired_capacity = 4

# Plan and apply
cd infra/opentofu/prod
tofu plan -var-file=../prod-ecs.tfvars -out=tfplan
tofu apply tfplan
```

### Task Definition Updates

Update application task definitions and restart services:

```bash
# Re-register task definition (from deployment script)
bash infra/scripts/prod_ecs/deploy-ycode.sh main

# Update service to use new task definition
aws ecs update-service \
  --cluster yuvro-prod-ecs-cluster \
  --service ycode-backend \
  --task-definition ycode-backend:NEW_REVISION \
  --region ap-south-1
```

## Maintenance

### Database Backups

RDS backups are configured automatically:

```bash
# List backups
aws rds describe-db-snapshots --db-instance-identifier prod-yuvro-db --region ap-south-1

# Create manual backup
aws rds create-db-snapshot \
  --db-instance-identifier prod-yuvro-db \
  --db-snapshot-identifier prod-yuvro-db-backup-$(date +%Y%m%d) \
  --region ap-south-1
```

### Monitoring

View CloudWatch metrics:

```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=ycode-backend Name=ClusterName,Value=yuvro-prod-ecs-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region ap-south-1
```

### Troubleshooting

#### Services Not Starting

1. Check task definition:
```bash
aws ecs describe-task-definition \
  --task-definition ycode-backend \
  --region ap-south-1
```

2. Check service events:
```bash
aws ecs describe-services \
  --cluster yuvro-prod-ecs-cluster \
  --services ycode-backend \
  --region ap-south-1 | grep -A 20 Events
```

3. Check CloudWatch logs:
```bash
aws logs tail /ecs/yuvro-prod-ecs-cluster --follow --region ap-south-1
```

#### Database Connection Issues

1. Verify security group allows traffic from ECS instances
2. Check RDS endpoint and credentials
3. Verify database exists: `aws rds describe-db-instances --region ap-south-1`

#### EC2 Instances Not Starting

1. Check Auto Scaling Group:
```bash
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names yuvro-prod-ecs-asg \
  --region ap-south-1
```

2. Check EC2 instances:
```bash
aws ec2 describe-instances --region ap-south-1 | grep -A 5 "yuvro-prod-ecs"
```

3. Check instance logs (via SSH or Systems Manager Session Manager)

## Switching Between EKS and ECS

### Deploy to EKS Instead

```bash
# Infrastructure
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy-infra

# Applications
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy
```

### Switching Costs and Considerations

- **Database:** Shared between EKS and ECS (same RDS instance)
- **Time:** ECS cluster creation (~20 min), EKS cluster creation (~30 min)
- **Cost:** Similar (managed nodes in both), ECS may be slightly cheaper

## Advanced Topics

### Custom Task Definitions

Edit `infra/scripts/prod_ecs/deploy-{app}.sh` to customize:
- CPU/memory per task
- Environment variables
- Port mappings
- Volume mounts
- Log configuration

### Secrets Management

Store secrets in AWS Secrets Manager:

```bash
# Create secret
aws secretsmanager create-secret \
  --name prod/ycode/db-password \
  --secret-string "your-password" \
  --region ap-south-1

# Reference in task definition:
# "secrets": [
#   {
#     "name": "DB_PASSWORD",
#     "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:prod/ycode/db-password"
#   }
# ]
```

### Load Balancing

Configure AWS Application Load Balancer (ALB):

1. Create ALB in VPC
2. Register ECS services as targets
3. Configure target groups and health checks
4. Update DNS records

## Cost Estimation

**Monthly cost estimate (per app):**
- ECS Cluster: 2x t3.large instances (~$50-70/month)
- RDS: 1x db.t3.medium (~$40-50/month)
- Data transfer: ~$10-20/month
- CloudWatch logs: ~$5-10/month

**Total (all 5 apps + executor):** ~$200-300/month

Cost varies by region and data transfer volume.

## Support and Documentation

- **OpenTofu Documentation:** https://opentofu.org/docs
- **AWS ECS Documentation:** https://docs.aws.amazon.com/ecs
- **Yuvro Infrastructure Guide:** See `INFRASTRUCTURE_SUMMARY.md`
- **Deployment Scripts:** `infra/scripts/prod_ecs/`

---

**Last Updated:** October 7, 2026  
**Status:** Production Ready ✅
