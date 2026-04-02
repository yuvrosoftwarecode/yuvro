# Infrastructure Quick Start Guide

## Local Development with LocalStack

### 1. Start LocalStack

```bash
cd infra
make localstack-up
```

This starts:
- LocalStack container with AWS service emulation
- LocalStack UI (http://localhost:4571)
- Initialization scripts for S3, RDS, IAM, CloudWatch

### 2. Configure AWS SDK

```bash
export AWS_ENDPOINT_URL_S3=http://localhost:4566
export AWS_ENDPOINT_URL_RDS=http://localhost:4566
export AWS_ENDPOINT_URL_IAM=http://localhost:4566
export AWS_ENDPOINT_URL_CLOUDWATCH=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Verify Services

```bash
# List S3 buckets
aws s3 ls --endpoint-url http://localhost:4566

# List RDS instances
aws rds describe-db-instances --endpoint-url http://localhost:4566

# List IAM roles
aws iam list-roles --endpoint-url http://localhost:4566
```

### 4. Stop LocalStack

```bash
make localstack-down
```

## AWS Deployment (Staging)

### 1. Prerequisites

```bash
# Check prerequisites
make check-all

# Install OpenTofu if needed
# https://opentofu.org/docs/intro/install/
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region (us-east-1)
```

### 3. Create EC2 Key Pair

```bash
# Create key pair in AWS
aws ec2 create-key-pair --key-name ycode-staging --query 'KeyMaterial' --output text > ycode-staging.pem
chmod 400 ycode-staging.pem
```

### 4. Update Staging Configuration

```bash
cd infra/opentofu

# Edit staging.tfvars with your values
vim staging.tfvars

# Key values to update:
# - key_pair_name: ycode-staging (or your key pair name)
# - ycode_db_password: secure password
# - ycampus_db_password: secure password
```

### 5. Initialize OpenTofu

```bash
tofu init
```

### 6. Plan Deployment

```bash
tofu plan -var-file=staging.tfvars -out=tfplan
```

Review the plan output to verify resources.

### 7. Apply Configuration

```bash
tofu apply tfplan
```

This will create:
- VPC with public and private subnets
- 2 EC2 instances for Kubernetes
- 2 RDS PostgreSQL databases
- S3 buckets for data and logs
- IAM roles and policies
- CloudWatch log groups and alarms
- Security groups

### 8. Get Outputs

```bash
tofu output

# Or specific outputs:
tofu output kubernetes_node_ids
tofu output ycode_db_endpoint
tofu output ycampus_db_endpoint
```

## AWS Deployment (Production)

### 1. Update Production Configuration

```bash
cd infra/opentofu

# Edit prod.tfvars
vim prod.tfvars

# Key differences from staging:
# - instance_type: t3.medium (larger)
# - instance_count: 3 (more nodes)
# - multi_az: true (high availability)
# - backup_retention_days: 30 (longer retention)
```

### 2. Plan Production Deployment

```bash
tofu plan -var-file=prod.tfvars -out=tfplan
```

### 3. Apply Production Configuration

```bash
tofu apply tfplan
```

## Troubleshooting

### LocalStack Not Starting

```bash
# Check Docker
docker ps

# View logs
make localstack-logs

# Restart
make localstack-down
make localstack-up
```

### AWS Credentials Error

```bash
# Verify credentials
aws sts get-caller-identity

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_DEFAULT_REGION
```

### OpenTofu Errors

```bash
# Validate configuration
cd infra/opentofu
tofu validate

# Check state
tofu state list

# View specific resource
tofu state show 'module.vpc.aws_vpc.main'
```

### Database Connection Issues

```bash
# Get database endpoint
tofu output ycode_db_endpoint

# Test connection (from EC2 node)
psql -h <endpoint> -U ycode_admin -d ycode
```

## Next Steps

1. **Configure Kubernetes**
   - SSH into EC2 nodes
   - Initialize Kubernetes cluster with kubeadm
   - Deploy Helm charts

2. **Deploy Applications**
   - Push Docker images to ECR
   - Deploy YCode and YCampus services
   - Configure ingress and load balancing

3. **Setup Monitoring**
   - Configure CloudWatch dashboards
   - Set up alarms and notifications
   - Enable detailed monitoring

4. **Security Hardening**
   - Rotate database passwords
   - Enable encryption for all services
   - Configure network policies
   - Set up WAF rules

## Useful Commands

```bash
# View infrastructure costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost

# SSH into EC2 node
ssh -i ycode-staging.pem ubuntu@<public-ip>

# View RDS logs
aws rds describe-db-log-files --db-instance-identifier staging-ycode-db

# Create RDS snapshot
aws rds create-db-snapshot --db-instance-identifier staging-ycode-db --db-snapshot-identifier staging-ycode-db-backup-$(date +%Y%m%d)

# Scale Kubernetes nodes
cd infra/opentofu
# Edit staging.tfvars: instance_count = 5
tofu apply -var-file=staging.tfvars
```

## Support

For issues or questions:
1. Check the main [README.md](./README.md)
2. Review [OpenTofu documentation](https://opentofu.org/docs/)
3. Check [AWS documentation](https://docs.aws.amazon.com/)
4. Review [LocalStack documentation](https://docs.localstack.cloud/)
