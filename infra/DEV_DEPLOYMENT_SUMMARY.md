# Dev Environment Deployment Summary

## Overview

YCode dev environment uses a hybrid approach:
- **Local**: Docker Compose for applications (YCode, YCampus, Code Executor)
- **AWS**: RDS databases in ap-south-1 (India region)

This minimizes costs while maintaining full functionality.

## Architecture

```
┌─────────────────────────────────────┐
│   Local Development Machine         │
│  (Docker Compose)                   │
│                                     │
│  ├─ YCode Frontend (3000)           │
│  ├─ YCode Backend (8001)            │
│  ├─ YCampus Frontend (3002)         │
│  ├─ YCampus Backend (8003)          │
│  └─ Code Executor (8002)            │
└──────────────┬──────────────────────┘
               │ TCP/IP
               │
┌──────────────▼──────────────────────┐
│   AWS ap-south-1                    │
│  (RDS Databases)                    │
│                                     │
│  ├─ RDS YCode DB (db.t3.micro)      │
│  └─ RDS YCampus DB (db.t3.micro)    │
└─────────────────────────────────────┘
```

## Quick Start

### 1. Prerequisites
```bash
brew install docker awscli opentofu postgresql
aws configure  # Set region to ap-south-1
```

### 2. Deploy RDS
```bash
cd infra/opentofu
tofu init
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan
tofu output  # Save endpoints
```

### 3. Configure Environment
Update `.env.dev` files with RDS endpoints from step 2.

### 4. Start Applications
```bash
cd ../..
DEPLOY_ENV=dev make install
```

### 5. Access
- YCode: http://localhost:3000
- YCampus: http://localhost:3002

## Configuration Files

### OpenTofu
- `infra/opentofu/dev.tfvars` - Dev environment variables
  - Region: ap-south-1
  - Single AZ: ap-south-1a
  - Public subnets only (no NAT gateways)
  - RDS: db.t3.micro (10GB allocated, 20GB max)
  - EC2: instance_count = 0 (not used)

### Environment Files
- `yc-backend-api/.env.dev` - YCode backend
- `ycampus-backend-api/.env.dev` - YCampus backend
- `yc-web/.env.dev` - YCode frontend
- `ycampus-web/.env.dev` - YCampus frontend
- `yc-code-executor/.env.dev` - Code executor

### Docker Compose
- `docker-compose.yuvro.yml` - Common services
- `docker-compose.ycode.yml` - YCode services
- `docker-compose.ycampus.yml` - YCampus services
- `docker-compose.dev.yml` - Dev overrides

## Cost Breakdown

| Component | Cost/Month |
|-----------|-----------|
| RDS YCode (db.t3.micro, 2GB) | ~$5 |
| RDS YCampus (db.t3.micro, 2GB) | ~$5 |
| Data Transfer | ~$1 |
| Storage | ~$0.50 |
| **Total** | **~$11-12** |

**Savings vs alternatives:**
- vs EC2 + RDS + K8s: 70% cheaper
- vs All-in-AWS: 80% cheaper
- vs Standard dev: 50% cheaper

## Common Tasks

### Start/Stop
```bash
DEPLOY_ENV=dev make install      # Start
DEPLOY_ENV=dev make stop         # Stop
DEPLOY_ENV=dev make clean        # Clean
```

### Logs
```bash
DEPLOY_ENV=dev make logs                    # All logs
docker compose logs yc-backend-api -f       # Specific service
```

### Database
```bash
# Connect
psql -h <endpoint> -U ycode_admin -d ycode

# Migrations
DEPLOY_ENV=dev make makemigrations

# Load data
DEPLOY_ENV=dev make load-fixtures-ycode
```

### Testing
```bash
DEPLOY_ENV=dev make test-all      # All tests
DEPLOY_ENV=dev make format-all    # Format code
DEPLOY_ENV=dev make lint-all      # Lint code
```

## Troubleshooting

### Can't connect to RDS
```bash
# Check endpoint
tofu output ycode_db_endpoint

# Verify credentials
psql -h <endpoint> -U ycode_admin -d ycode

# Add your IP to security group
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr <your-ip>/32 \
  --region ap-south-1
```

### Port already in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Docker containers can't reach RDS
```bash
# Check security group inbound rules
aws ec2 describe-security-groups --region ap-south-1
```

## Scaling

### Increase Resources
Edit `infra/opentofu/dev.tfvars`:
```bash
# More storage
ycode_db_allocated_storage = 20

# Larger instance
ycode_db_instance_class = "db.t3.small"

# Apply
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

### Add EC2 Nodes (for K8s)
Edit `infra/opentofu/dev.tfvars`:
```bash
instance_count = 1  # Change from 0
instance_type = "t3.micro"

# Then deploy K8s
cd ../..
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
```

## Cleanup

### Stop Applications
```bash
DEPLOY_ENV=dev make stop
```

### Destroy RDS
```bash
cd infra/opentofu
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy
```

### Remove State
```bash
rm -rf infra/opentofu/.terraform
rm infra/opentofu/terraform.tfstate*
docker system prune -a
```

## Documentation

- **Quick Start**: `infra/DEPLOY_DEV_QUICK_START.md`
- **Full Guide**: `infra/DEPLOY_DEV_AWS.md`
- **Docker + RDS**: `infra/DEPLOY_DEV_DOCKER_RDS.md`
- **Automated Script**: `infra/scripts/deploy-dev-aws.sh`

## Automated Deployment

```bash
# Full deployment
bash infra/scripts/deploy-dev-aws.sh full

# Step by step
bash infra/scripts/deploy-dev-aws.sh init
bash infra/scripts/deploy-dev-aws.sh plan
bash infra/scripts/deploy-dev-aws.sh apply
bash infra/scripts/deploy-dev-aws.sh docker-start

# Manage
bash infra/scripts/deploy-dev-aws.sh docker-logs
bash infra/scripts/deploy-dev-aws.sh docker-stop
bash infra/scripts/deploy-dev-aws.sh destroy
```

## Key Features

✅ **Cost Optimized**: ~$23/month
✅ **Simple Setup**: Docker Compose locally
✅ **Scalable**: Easy to upgrade to EC2 + K8s
✅ **Secure**: RDS in private subnets (optional)
✅ **Automated**: One-command deployment script
✅ **Region**: ap-south-1 (India) for lower costs

## Next Steps

1. Follow Quick Start guide
2. Deploy RDS with OpenTofu
3. Configure environment files
4. Start Docker Compose
5. Access applications at localhost

## Support

- Check troubleshooting section above
- Review full documentation in `infra/DEPLOY_DEV_AWS.md`
- Run `bash infra/scripts/deploy-dev-aws.sh help`
