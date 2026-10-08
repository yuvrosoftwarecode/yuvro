# Production Infrastructure Deployment Guide

This guide covers deploying and managing production infrastructure using OpenTofu on AWS.

## Overview

Production infrastructure is managed through GitHub Actions workflows using OpenTofu:
- **Prod - Plan Infrastructure**: Automatic planning on infra changes (PRs)
- **Prod - Deploy Infrastructure**: Manual deployment workflow
- Supports plan, apply, and destroy operations

## Prerequisites

### AWS Setup
1. **AWS Account**: Production AWS account access
2. **IAM Role**: Role with permissions for:
   - EKS cluster creation and management
   - RDS database provisioning
   - VPC, subnets, security groups
   - IAM roles and policies
   - S3, ECR, and other services

3. **GitHub OIDC Provider**: Configured for GitHub Actions authentication
   ```
   - Provider: `token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - Subject: `repo:your-org/yuvro:*`
   ```

### Secrets Setup

Configure these secrets in GitHub repository settings:

#### AWS Credentials
- `PROD_AWS_ACCESS_KEY_ID`: AWS access key (if not using OIDC)
- `PROD_AWS_SECRET_ACCESS_KEY`: AWS secret key (if not using OIDC)
- `PROD_AWS_ROLE_TO_ASSUME`: ARN of IAM role for OIDC (optional)

#### Database Credentials
- `PROD_DB_MASTER_PASSWORD`: Master password for RDS database

#### AWS Region
- Default: `ap-south-1` (can be modified in workflow)

## Deployment Process

### 1. Plan Infrastructure Changes

#### Automatic (via Pull Request)
When infra files change in a PR, the plan workflow automatically runs and comments on the PR.

#### Manual Trigger
```bash
# Via GitHub UI
1. Go to Actions → "Prod - Plan Infrastructure"
2. Click "Run workflow"
3. Review the plan output in the step summary
```

### 2. Review Changes
- Review the infrastructure changes in the plan output
- Verify:
  - New resources being created
  - Resources being modified
  - Resources being destroyed
  - Security group rules
  - Database configurations

### 3. Deploy Infrastructure

```bash
# Via GitHub UI
1. Go to Actions → "Prod - Deploy Infrastructure"
2. Click "Run workflow"
3. Select action: "apply" (or "plan" to preview, "destroy" to tear down)
4. Click "Run workflow"
5. Wait for deployment (15-30 minutes typical)
6. Monitor progress in the workflow logs
```

#### Deployment Steps
1. Initialize OpenTofu
2. Create infrastructure plan
3. Apply changes (with auto-approve to avoid timeout)
4. Validate deployment
5. Output infrastructure details (EKS endpoint, RDS host, etc.)

### 4. Post-Deployment Validation

After successful deployment, the workflow automatically:
- Checks EKS cluster status
- Verifies RDS database status
- Confirms all resources are operational

## Configuration

### Production Variables (prod.tfvars)

```hcl
aws_region           = "ap-south-1"
environment          = "prod"
app_name             = "yuvro"

# EKS Configuration
eks_cluster_version  = "1.28"
eks_node_count       = 3
eks_instance_type    = "t3.large"

# RDS Configuration
rds_instance_class   = "db.t3.medium"
rds_allocated_storage = 100
rds_backup_retention_days = 30

# Networking
vpc_cidr = "10.0.0.0/16"
```

### Production Secrets (.env.prod-secrets)

```bash
DB_MASTER_PASSWORD=your-secure-password-here
```

## Infrastructure Components

### EKS (Kubernetes)
- **Cluster Version**: 1.28+
- **Node Groups**: Multi-AZ for HA
- **Instance Types**: t3.large (adjustable)
- **Networking**: VPC with public/private subnets

### RDS (PostgreSQL)
- **Engine**: PostgreSQL 15
- **Instance Class**: db.t3.medium (adjustable)
- **Storage**: 100GB (adjustable)
- **Backup**: 30-day retention
- **Multi-AZ**: Yes (for HA)

### Networking
- **VPC**: Custom VPC for isolation
- **Subnets**: Public + Private across AZs
- **Security Groups**: Restricted to necessary ports
- **NAT Gateway**: For private subnet outbound access

### IAM
- **EKS Service Role**: For cluster management
- **Node IAM Role**: For EC2 nodes
- **GitHub Actions Role**: For OIDC authentication

## Monitoring and Troubleshooting

### View Deployment Outputs
```bash
cd infra/opentofu/prod
tofu output
```

### Check Resource Status
```bash
# EKS Cluster
aws eks describe-cluster --name yuvro-prod-cluster --region ap-south-1

# RDS Database
aws rds describe-db-instances --db-instance-identifier yuvro-prod-db --region ap-south-1

# VPC
aws ec2 describe-vpcs --filters "Name=tag:Environment,Values=prod" --region ap-south-1
```

### Common Issues

#### Authentication Failures
- Verify AWS credentials in GitHub secrets
- Check IAM role permissions
- Validate OIDC provider configuration

#### Resource Already Exists
- Check if resources exist in AWS console
- Consider importing existing resources
- Or destroy and recreate

#### Plan Takes Too Long
- Normal for first deployment (20-30 minutes)
- Subsequent plans are usually faster
- Check CloudFormation stack events in AWS console

## Rollback

### Emergency Rollback
If deployment causes issues:

```bash
1. Manually revert the infrastructure in AWS console (if necessary)
2. Or use the destroy workflow to tear down and redeploy
```

### Controlled Rollback
```bash
1. Make changes to Terraform code
2. Run plan to preview changes
3. Run apply to implement rollback
```

## Maintenance

### Updating Infrastructure
1. Create a branch with your changes
2. Create a PR to trigger the plan workflow
3. Review the plan comments on the PR
4. Merge and run the deploy workflow
5. Monitor deployment completion

### Updating Variables
1. Modify `prod.tfvars` for variable changes
2. Commit and push to main
3. Trigger deploy workflow with new values

### Scaling

#### Adding EKS Nodes
```hcl
# In prod.tfvars
eks_node_count = 5  # Increase from 3
```

#### Upgrading RDS Instance
```hcl
# In prod.tfvars
rds_instance_class = "db.t3.large"  # Upgrade from t3.medium
```

## Disaster Recovery

### Database Backup
- Automatic backups: 30 days retention
- Manual backup: Via RDS console or AWS CLI
- Restore: From snapshot in RDS console

### Kubernetes Backup
- Persistent volumes backed up daily
- Helm chart states stored in Git
- Configuration stored in ConfigMaps/Secrets

## Cost Optimization

### Monitoring Costs
```bash
# View AWS Cost Explorer
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost --region ap-south-1
```

### Cost Reduction Options
1. Reduce EKS node count (e.g., from 3 to 2)
2. Downgrade RDS instance class
3. Reduce storage allocation
4. Use spot instances (if applicable)

## Related Documentation

- [OpenTofu Documentation](https://opentofu.org/docs/)
- [AWS EKS Best Practices](https://aws.amazon.com/eks/best-practices/)
- [Yuvro Infrastructure Summary](../INFRASTRUCTURE_SUMMARY.md)
- [OPENTOFU_DEPLOYMENT_SUMMARY.md](../OPENTOFU_DEPLOYMENT_SUMMARY.md)

## Support

For issues or questions:
1. Check the workflow logs in GitHub Actions
2. Review AWS CloudFormation events
3. Consult the troubleshooting section above
4. Contact your DevOps team

