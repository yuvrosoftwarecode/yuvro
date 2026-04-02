# YCode Infrastructure as Code

This directory contains OpenTofu infrastructure definitions for deploying YCode and YCampus platforms on AWS EC2 with Kubernetes, along with LocalStack for local AWS service emulation.

## Directory Structure

```
infra/
├── opentofu/                 # OpenTofu infrastructure code
│   ├── main.tf              # Main configuration
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Output values
│   ├── terraform.tfvars.example  # Example variables file
│   └── modules/             # Reusable modules
│       ├── vpc/             # VPC and networking
│       ├── security_groups/ # Security groups
│       ├── ec2_nodes/       # Kubernetes EC2 nodes
│       ├── rds/             # RDS PostgreSQL databases
│       ├── s3/              # S3 buckets
│       ├── iam/             # IAM roles and policies
│       └── cloudwatch/      # CloudWatch monitoring
└── localstack/              # LocalStack configuration
    ├── docker-compose.yml   # LocalStack services
    └── init-aws.sh          # Initialization script
```

## Prerequisites

### For AWS Deployment (Staging/Production)

1. **OpenTofu** (>= 1.0)
   ```bash
   # Install OpenTofu
   # https://opentofu.org/docs/intro/install/
   ```

2. **AWS CLI** (>= 2.0)
   ```bash
   # Install AWS CLI
   # https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
   ```

3. **AWS Credentials**
   ```bash
   # Configure AWS credentials
   aws configure
   # Or set environment variables:
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_DEFAULT_REGION=us-east-1
   ```

4. **EC2 Key Pair**
   ```bash
   # Create an EC2 key pair in AWS console or CLI
   aws ec2 create-key-pair --key-name ycode-prod --query 'KeyMaterial' --output text > ycode-prod.pem
   chmod 400 ycode-prod.pem
   ```

### For Local Development (LocalStack)

1. **Docker** (>= 20.10)
2. **Docker Compose** (>= 1.29)

## Quick Start

### Local Development with LocalStack

1. **Start LocalStack services**
   ```bash
   cd infra/localstack
   docker-compose up -d
   ```

2. **Verify LocalStack is running**
   ```bash
   # Check LocalStack health
   docker-compose ps
   
   # Access LocalStack UI
   # http://localhost:4571
   ```

3. **Configure AWS SDK for LocalStack**
   ```bash
   export AWS_ENDPOINT_URL_S3=http://localhost:4566
   export AWS_ENDPOINT_URL_RDS=http://localhost:4566
   export AWS_ENDPOINT_URL_IAM=http://localhost:4566
   export AWS_ENDPOINT_URL_CLOUDWATCH=http://localhost:4566
   export AWS_ACCESS_KEY_ID=test
   export AWS_SECRET_ACCESS_KEY=test
   export AWS_DEFAULT_REGION=us-east-1
   ```

4. **Verify AWS services**
   ```bash
   # List S3 buckets
   aws s3 ls --endpoint-url http://localhost:4566
   
   # List RDS instances
   aws rds describe-db-instances --endpoint-url http://localhost:4566
   ```

### AWS Deployment (Staging/Production)

1. **Prepare variables file**
   ```bash
   cd infra/opentofu
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   vim terraform.tfvars
   ```

2. **Initialize OpenTofu**
   ```bash
   tofu init
   ```

3. **Plan deployment**
   ```bash
   tofu plan -out=tfplan
   ```

4. **Apply configuration**
   ```bash
   tofu apply tfplan
   ```

5. **Get outputs**
   ```bash
   tofu output
   ```

## Configuration

### OpenTofu Variables

Key variables for customization:

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region | `us-east-1` |
| `environment` | Environment name (staging/prod) | Required |
| `instance_type` | EC2 instance type | `t3.medium` |
| `instance_count` | Number of Kubernetes nodes | `3` |
| `ycode_db_instance_class` | YCode RDS instance class | `db.t3.micro` |
| `ycampus_db_instance_class` | YCampus RDS instance class | `db.t3.micro` |
| `backup_retention_days` | Database backup retention | `7` |
| `multi_az` | Enable Multi-AZ for RDS | `true` |

### LocalStack Services

LocalStack emulates the following AWS services:

- **S3**: Object storage for application data and logs
- **RDS**: PostgreSQL databases for YCode and YCampus
- **IAM**: Identity and access management
- **CloudWatch**: Logging and monitoring
- **SQS**: Message queues
- **SNS**: Notification topics

## Infrastructure Components

### VPC and Networking

- **VPC**: 10.0.0.0/16 CIDR block
- **Public Subnets**: 3 subnets for NAT gateways and load balancers
- **Private Subnets**: 3 subnets for Kubernetes nodes and RDS
- **NAT Gateways**: One per availability zone for outbound traffic
- **Internet Gateway**: For public subnet internet access

### Security Groups

- **Kubernetes SG**: Allows SSH, Kubernetes API, kubelet, node ports
- **RDS SG**: Allows PostgreSQL from Kubernetes nodes
- **ALB SG**: Allows HTTP/HTTPS for load balancer

### EC2 Nodes

- **Instance Type**: Configurable (default: t3.medium)
- **Count**: Configurable (default: 3)
- **AMI**: Ubuntu 22.04 LTS
- **Root Volume**: Encrypted, configurable size (default: 50GB)
- **IAM Role**: Permissions for EC2, S3, CloudWatch, SSM

### RDS Databases

- **YCode Database**: Separate PostgreSQL instance
- **YCampus Database**: Separate PostgreSQL instance
- **Features**:
  - Multi-AZ deployment
  - Automated backups
  - Encryption at rest
  - CloudWatch logs
  - IAM database authentication

### S3 Buckets

- **App Data Bucket**: For application uploads and data
- **Logs Bucket**: For application and infrastructure logs
- **Features**:
  - Versioning enabled
  - Encryption at rest
  - Public access blocked
  - Lifecycle policies for old versions

### IAM Roles

- **App Service Role**: For application pods to access AWS services
- **Kubernetes Node Role**: For EC2 nodes to access AWS services
- **Policies**: S3 access, CloudWatch logs, Secrets Manager, EC2 describe

### CloudWatch

- **Log Groups**: Application, Kubernetes, Database logs
- **Metrics**: CPU, memory, disk utilization
- **Alarms**: High CPU, memory, disk usage
- **Dashboard**: Unified monitoring dashboard

## Deployment Workflows

### Staging Deployment

```bash
cd infra/opentofu
tofu workspace new staging
tofu plan -var-file=staging.tfvars
tofu apply -var-file=staging.tfvars
```

### Production Deployment

```bash
cd infra/opentofu
tofu workspace new prod
tofu plan -var-file=prod.tfvars
tofu apply -var-file=prod.tfvars
```

### State Management

For production, configure remote state:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "ycode-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

## Outputs

After deployment, retrieve outputs:

```bash
tofu output kubernetes_node_ids
tofu output ycode_db_endpoint
tofu output ycampus_db_endpoint
tofu output app_data_bucket_name
```

## Troubleshooting

### LocalStack Issues

**LocalStack not responding**
```bash
# Check container logs
docker-compose logs localstack

# Restart services
docker-compose restart
```

**AWS CLI commands failing**
```bash
# Verify endpoint configuration
echo $AWS_ENDPOINT_URL_S3

# Test connectivity
aws s3 ls --endpoint-url http://localhost:4566
```

### OpenTofu Issues

**Authentication errors**
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_DEFAULT_REGION
```

**State lock issues**
```bash
# Force unlock (use with caution)
tofu force-unlock <LOCK_ID>
```

## Maintenance

### Backup and Recovery

```bash
# Create manual RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier staging-ycode-db \
  --db-snapshot-identifier staging-ycode-db-backup-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots
```

### Scaling

```bash
# Update instance count in terraform.tfvars
instance_count = 5

# Apply changes
tofu apply
```

### Updates

```bash
# Update Kubernetes version
kubernetes_version = "1.29"

# Plan and apply
tofu plan
tofu apply
```

## Security Best Practices

1. **Secrets Management**
   - Use AWS Secrets Manager for sensitive data
   - Never commit secrets to version control
   - Rotate credentials regularly

2. **Network Security**
   - Use private subnets for databases
   - Restrict security group ingress rules
   - Enable VPC Flow Logs

3. **Access Control**
   - Use IAM roles instead of access keys
   - Enable MFA for AWS console access
   - Audit IAM permissions regularly

4. **Encryption**
   - Enable encryption at rest for all services
   - Use TLS for data in transit
   - Rotate encryption keys regularly

## Cost Optimization

1. **Right-sizing**
   - Start with smaller instance types
   - Monitor utilization and scale as needed
   - Use Reserved Instances for production

2. **Storage**
   - Set appropriate backup retention periods
   - Use S3 lifecycle policies
   - Archive old logs to Glacier

3. **Monitoring**
   - Set up cost alerts
   - Review AWS Cost Explorer regularly
   - Identify unused resources

## Support and Documentation

- [OpenTofu Documentation](https://opentofu.org/docs/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## License

This infrastructure code is part of the YCode project and follows the same license.
