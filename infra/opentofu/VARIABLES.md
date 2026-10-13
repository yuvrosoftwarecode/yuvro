# OpenTofu Variables Documentation

This document describes all variables used in the Yuvro OpenTofu infrastructure configuration.

## Overview

Variables are defined in:
- `dev.tfvars` - Development environment
- `prod.tfvars` - Production environment
- `modules/*/variables.tf` - Module-level variable definitions

## Environment Configuration

### aws_region
- **Type**: `string`
- **Description**: AWS region for infrastructure deployment
- **Development**: `ap-south-1` (Mumbai)
- **Production**: `ap-south-1` (Mumbai)
- **Example**: `"ap-south-1"`

### environment
- **Type**: `string`
- **Description**: Deployment environment identifier
- **Values**: `dev`, `staging`, `prod`
- **Used in**: Resource naming, tags, DNS records

### app_name
- **Type**: `string`
- **Description**: Application name for resource naming
- **Value**: `"yuvro"`
- **Used in**: EKS cluster name, RDS instance ID, etc.

## EKS (Kubernetes) Configuration

### eks_cluster_version
- **Type**: `string`
- **Description**: Kubernetes version for EKS cluster
- **Development**: `"1.28"`
- **Production**: `"1.28"`
- **Minimum**: `"1.27"` (support lifecycle)

### eks_node_count
- **Type**: `number`
- **Description**: Number of EKS worker nodes
- **Development**: `2` (cost-effective)
- **Production**: `3` (high availability)
- **Range**: `1-10` (configurable up to limits)
- **Note**: Nodes are distributed across availability zones

### eks_instance_type
- **Type**: `string`
- **Description**: EC2 instance type for EKS nodes
- **Development**: `"t3.medium"` (cost-effective)
- **Production**: `"t3.large"` (performance)
- **Options**:
  - `t3.medium` - 1 vCPU, 1 GB RAM (lowest cost)
  - `t3.large` - 2 vCPU, 8 GB RAM (recommended)
  - `t3.xlarge` - 4 vCPU, 16 GB RAM (high performance)
  - `m5.large` - 2 vCPU, 8 GB RAM (general purpose)

### eks_enable_logging
- **Type**: `bool`
- **Description**: Enable EKS control plane logging
- **Development**: `false` (cost savings)
- **Production**: `true` (compliance, debugging)

### eks_log_retention_days
- **Type**: `number`
- **Description**: CloudWatch log retention period (days)
- **Development**: `7`
- **Production**: `30`
- **Range**: `1-3653`

## RDS (PostgreSQL) Configuration

### rds_instance_class
- **Type**: `string`
- **Description**: RDS instance type
- **Development**: `"db.t3.micro"` (free tier eligible)
- **Production**: `"db.t3.medium"` (performance)
- **Options**:
  - `db.t3.micro` - 1 vCPU, 1 GB RAM (lowest cost)
  - `db.t3.small` - 1 vCPU, 2 GB RAM
  - `db.t3.medium` - 1 vCPU, 4 GB RAM (recommended)
  - `db.t3.large` - 2 vCPU, 8 GB RAM (high performance)

### rds_allocated_storage
- **Type**: `number`
- **Description**: Initial allocated storage (GB)
- **Development**: `20`
- **Production**: `100`
- **Range**: `20-65536` (depends on instance type)

### rds_max_allocated_storage
- **Type**: `number`
- **Description**: Maximum auto-scaling storage (GB)
- **Development**: `100`
- **Production**: `500`
- **Must be**: `>= rds_allocated_storage`

### rds_backup_retention_days
- **Type**: `number`
- **Description**: Backup retention period (days)
- **Development**: `7`
- **Production**: `30`
- **Range**: `1-35`

### rds_multi_az
- **Type**: `bool`
- **Description**: Enable Multi-AZ for high availability
- **Development**: `false` (cost savings)
- **Production**: `true` (HA, automatic failover)

### rds_engine_version
- **Type**: `string`
- **Description**: PostgreSQL version
- **Current**: `"15.3"`
- **Available**: `15.x`, `14.x`, `13.x` (AWS dependent)

### rds_db_name
- **Type**: `string`
- **Description**: Initial database name
- **Development**: `"yuvro_dev_db"`
- **Production**: `"yuvro_prod_db"`

### rds_master_username
- **Type**: `string`
- **Description**: Master username
- **Default**: `"postgres"`
- **Note**: Must start with letter, alphanumeric only

### db_master_password (SENSITIVE)
- **Type**: `string`
- **Description**: Master password
- **Source**: GitHub secret or .env file
- **Requirements**:
  - 8+ characters
  - Mixed case, numbers, special characters
  - No `/@"'` characters for compatibility

## Networking Configuration

### vpc_cidr
- **Type**: `string`
- **Description**: VPC CIDR block
- **Development**: `"10.0.0.0/16"`
- **Production**: `"10.0.0.0/16"`
- **Allows**: 65,536 IP addresses
- **Subnets**: 
  - Public: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
  - Private: 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24

### enable_nat_gateway
- **Type**: `bool`
- **Description**: Enable NAT Gateway for private subnets
- **Development**: `true`
- **Production**: `true`
- **Cost Impact**: ~$32/month per NAT Gateway

## IAM Configuration

### github_org
- **Type**: `string`
- **Description**: GitHub organization for OIDC
- **Value**: Your GitHub organization name

### github_repo
- **Type**: `string`
- **Description**: GitHub repository for OIDC
- **Value**: `"yuvro"` or your repo name

### github_role_arn
- **Type**: `string`
- **Description**: IAM role ARN for GitHub Actions
- **Format**: `arn:aws:iam::ACCOUNT:role/github-actions-role`

## Security Configuration

### enable_encryption
- **Type**: `bool`
- **Description**: Enable encryption for storage
- **Development**: `true`
- **Production**: `true`
- **Scope**: RDS, EBS, S3

### enable_deletion_protection
- **Type**: `bool`
- **Description**: Prevent accidental resource deletion
- **Development**: `false`
- **Production**: `true`

### allowed_ssh_cidr
- **Type**: `list(string)`
- **Description**: CIDR blocks allowed for SSH
- **Development**: `["0.0.0.0/0"]` (open, not recommended)
- **Production**: `["YOUR_IP/32"]` (restricted)
- **Format**: IPv4 CIDR notation

## Tagging

### tags
- **Type**: `map(string)`
- **Description**: Common tags for all resources
- **Includes**:
  - `Environment`: Environment name
  - `Project`: Project identifier
  - `ManagedBy`: "Terraform" or "OpenTofu"
  - `Owner`: Team or person
  - `CostCenter`: For billing

## Variable Usage Examples

### Scaling Up EKS
```hcl
# In prod.tfvars
eks_node_count = 5  # Increase from 3
```

### Increasing Database Storage
```hcl
# In prod.tfvars
rds_allocated_storage = 200  # Increase from 100
rds_max_allocated_storage = 1000  # Auto-scaling limit
```

### Upgrading Kubernetes Version
```hcl
# In prod.tfvars
eks_cluster_version = "1.29"  # Upgrade from 1.28
```

## Default Values

### Development (dev.tfvars)
```hcl
aws_region                 = "ap-south-1"
environment                = "dev"
app_name                   = "yuvro"

# EKS
eks_cluster_version        = "1.28"
eks_node_count             = 2
eks_instance_type          = "t3.medium"
eks_enable_logging         = false
eks_log_retention_days     = 7

# RDS
rds_instance_class         = "db.t3.micro"
rds_allocated_storage      = 20
rds_max_allocated_storage  = 100
rds_backup_retention_days  = 7
rds_multi_az               = false

# Security
enable_deletion_protection = false
allowed_ssh_cidr           = ["0.0.0.0/0"]
```

### Production (prod.tfvars)
```hcl
aws_region                 = "ap-south-1"
environment                = "prod"
app_name                   = "yuvro"

# EKS
eks_cluster_version        = "1.28"
eks_node_count             = 3
eks_instance_type          = "t3.large"
eks_enable_logging         = true
eks_log_retention_days     = 30

# RDS
rds_instance_class         = "db.t3.medium"
rds_allocated_storage      = 100
rds_max_allocated_storage  = 500
rds_backup_retention_days  = 30
rds_multi_az               = true

# Security
enable_deletion_protection = true
allowed_ssh_cidr           = ["YOUR_IP/32"]
```

## Cost Estimation

### Development Environment (Monthly)
- EKS: ~$50 (t3.medium x 2)
- RDS: ~$15 (db.t3.micro)
- NAT Gateway: ~$32
- Data Transfer: ~$5
- **Total**: ~$100-120/month

### Production Environment (Monthly)
- EKS: ~$150 (t3.large x 3)
- RDS: ~$150 (db.t3.medium, multi-AZ)
- NAT Gateway: ~$32
- Data Transfer: ~$50
- **Total**: ~$380-400/month

## Cost Optimization Tips

1. **Development**: Use `t3.micro` RDS and single node EKS
2. **Off-peak**: Scale down EKS nodes when not needed
3. **Storage**: Set appropriate backup retention
4. **Logging**: Use shorter retention for non-prod environments

## Related Documentation

- [AWS EKS Pricing](https://aws.amazon.com/eks/pricing/)
- [AWS RDS Pricing](https://aws.amazon.com/rds/pricing/)
- [OpenTofu Variables Reference](https://opentofu.org/docs/language/values/variables/)

