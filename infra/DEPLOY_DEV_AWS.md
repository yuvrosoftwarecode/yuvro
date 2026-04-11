# Deploying YCode Dev Environment with Docker Compose + AWS RDS

This guide deploys YCode and YCampus applications locally using Docker Compose, with databases hosted on AWS RDS in ap-south-1 (India region).

## Architecture Overview

```
Local Development Machine              AWS (ap-south-1)
├── Docker Compose                     ├── VPC (10.0.0.0/16)
│   ├── YCode Frontend (3000)          ├── RDS YCode DB (db.t3.micro)
│   ├── YCode Backend (8001)           └── RDS YCampus DB (db.t3.micro)
│   ├── YCampus Frontend (3002)
│   ├── YCampus Backend (8003)
│   └── Code Executor (8002)
```

## Prerequisites

### Local Machine

1. **Docker & Docker Compose**
   ```bash
   # macOS with Homebrew
   brew install docker docker-compose
   
   # Or download Docker Desktop: https://www.docker.com/products/docker-desktop
   ```

2. **Git**
   ```bash
   brew install git
   ```

### AWS Account

1. **Create AWS Account** (if needed)
   - Go to https://aws.amazon.com/
   - Click "Create an AWS Account"

2. **Configure AWS Credentials**
   ```bash
   aws configure
   ```
   When prompted:
   - AWS Access Key ID: [your-key]
   - AWS Secret Access Key: [your-secret]
   - Default region: `ap-south-1`
   - Default output format: `json`

3. **Verify AWS Credentials**
   ```bash
   aws sts get-caller-identity
   ```

### Tools

1. **OpenTofu** (for infrastructure)
   ```bash
   brew install opentofu
   ```

2. **PostgreSQL Client** (optional, for database access)
   ```bash
   brew install postgresql
   ```

## Deployment Steps

### Step 1: Deploy RDS Databases

```bash
cd infra/opentofu

# Initialize OpenTofu
tofu init

# Plan deployment
tofu plan -var-file=dev.tfvars -out=tfplan

# Apply configuration (creates RDS instances in ap-south-1)
tofu apply tfplan
```

This creates:
- VPC with public subnets in ap-south-1a
- 2x db.t3.micro RDS PostgreSQL instances
- Security groups for database access
- S3 buckets for application data

**Deployment time: 5-10 minutes**

### Step 2: Retrieve RDS Endpoints

```bash
# Get all outputs
tofu output

# Or get specific values
tofu output -raw ycode_db_endpoint
tofu output -raw ycampus_db_endpoint
```

Save these values:
- `ycode_db_endpoint`
- `ycode_db_username` (ycode_admin)
- `ycode_db_password`
- `ycampus_db_endpoint`
- `ycampus_db_username` (ycampus_admin)
- `ycampus_db_password`

### Step 3: Configure Environment Files

Update `.env` files for each service with RDS endpoints:

**yc-backend-api/.env.dev**
```bash
# Database Configuration
DATABASE_URL=postgresql://ycode_admin:ChangeMe123!DevPassword@<ycode_db_endpoint>:5432/ycode
DB_HOST=<ycode_db_endpoint>
DB_PORT=5432
DB_NAME=ycode
DB_USER=ycode_admin
DB_PASSWORD=ChangeMe123!DevPassword

# Django Settings
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
SECRET_KEY=your-secret-key-here

# Other configurations
DEPLOY_ENV=dev
```

**ycampus-backend-api/.env.dev**
```bash
# Database Configuration
DATABASE_URL=postgresql://ycampus_admin:ChangeMe123!DevPassword@<ycampus_db_endpoint>:5432/ycampus
DB_HOST=<ycampus_db_endpoint>
DB_PORT=5432
DB_NAME=ycampus
DB_USER=ycampus_admin
DB_PASSWORD=ChangeMe123!DevPassword

# Django Settings
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
SECRET_KEY=your-secret-key-here

# Other configurations
DEPLOY_ENV=dev
```

**yc-web/.env.dev**
```bash
VITE_API_URL=http://localhost:8001
VITE_DEPLOY_ENV=dev
```

**ycampus-web/.env.dev**
```bash
VITE_API_URL=http://localhost:8003
VITE_DEPLOY_ENV=dev
```

**yc-code-executor/.env.dev**
```bash
DEBUG=True
DEPLOY_ENV=dev
```

### Step 4: Start Applications with Docker Compose

```bash
# From project root
cd ../..

# Start all services
DEPLOY_ENV=dev make install

# Or start specific platform
DEPLOY_ENV=dev make install-ycode
DEPLOY_ENV=dev make install-ycampus
```

### Step 5: Verify Deployment

```bash
# Check running containers
docker compose ps

# View logs
DEPLOY_ENV=dev make logs

# Test backend connectivity
curl http://localhost:8001/api/health
curl http://localhost:8003/api/health
```

### Step 6: Access Applications

- **YCode Frontend**: http://localhost:3000
- **YCode Backend API**: http://localhost:8001
- **YCampus Frontend**: http://localhost:3002
- **YCampus Backend API**: http://localhost:8003
- **Code Executor**: http://localhost:8002

## Database Management

### Connect to RDS Database

```bash
# Connect to YCode database
psql -h <ycode_db_endpoint> -U ycode_admin -d ycode

# Connect to YCampus database
psql -h <ycampus_db_endpoint> -U ycampus_admin -d ycampus
```

### Run Migrations

```bash
# YCode migrations
DEPLOY_ENV=dev make makemigrations-ycode

# YCampus migrations
DEPLOY_ENV=dev make makemigrations-ycampus
```

### Load Test Data

```bash
# Load YCode fixtures
DEPLOY_ENV=dev make load-fixtures-ycode

# Load YCampus fixtures
DEPLOY_ENV=dev make load-fixtures-ycampus
```

## Common Commands

```bash
# Start all services
DEPLOY_ENV=dev make install

# Stop all services
DEPLOY_ENV=dev make stop

# Clean up containers and volumes
DEPLOY_ENV=dev make clean

# View logs
DEPLOY_ENV=dev make logs

# View specific service logs
docker compose logs yc-backend-api -f
docker compose logs ycampus-backend-api -f

# Run tests
DEPLOY_ENV=dev make test-all

# Format code
DEPLOY_ENV=dev make format-all

# Lint code
DEPLOY_ENV=dev make lint-all
```

## Troubleshooting

### Issue: Can't connect to RDS database

```bash
# Verify RDS endpoint is accessible
telnet <rds_endpoint> 5432

# Check security group allows inbound traffic
aws ec2 describe-security-groups --region ap-south-1 \
  --query 'SecurityGroups[?Tags[?Key==`Environment` && Value==`dev`]]'

# Verify credentials
psql -h <rds_endpoint> -U ycode_admin -d ycode
```

### Issue: Docker containers can't reach RDS

```bash
# Check Docker network
docker network ls

# Verify RDS security group allows your local IP
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr <your-ip>/32 \
  --region ap-south-1
```

### Issue: Migrations fail

```bash
# Check database connection
docker compose exec yc-backend-api python manage.py dbshell

# Run migrations manually
docker compose exec yc-backend-api python manage.py migrate

# Check migration status
docker compose exec yc-backend-api python manage.py showmigrations
```

### Issue: Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: RDS endpoint not found

```bash
# Verify RDS was created
aws rds describe-db-instances --region ap-south-1

# Check OpenTofu state
cd infra/opentofu
tofu show
```

## Cost Estimation

**Monthly costs for minimal dev environment (testing):**

| Resource | Type | Cost |
|----------|------|------|
| RDS YCode | db.t3.micro (2GB) | ~$5 |
| RDS YCampus | db.t3.micro (2GB) | ~$5 |
| Data Transfer | Outbound | ~$1 |
| Storage | 4GB total | ~$0.50 |
| **Total** | | **~$11-12/month** |

**Configuration for testing:**
- Storage: 2GB allocated, 5GB max (minimal)
- Backups: 0 days (no backups for testing)
- Multi-AZ: false (single AZ)
- Region: ap-south-1 (India - lowest cost)

**Comparison:**
- Dev with EC2 + RDS + Kubernetes: ~$35-40/month
- Dev with Docker Compose + RDS (standard): ~$23/month
- Dev with Docker Compose + RDS (minimal/testing): ~$11-12/month
- **Savings: ~70% vs EC2 setup**

## Scaling

### Increase RDS Storage

```bash
# Edit dev.tfvars
ycode_db_allocated_storage = 20
ycampus_db_allocated_storage = 20

# Apply changes
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

### Upgrade RDS Instance Type

```bash
# Edit dev.tfvars
ycode_db_instance_class = "db.t3.small"
ycampus_db_instance_class = "db.t3.small"

# Apply changes
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

## Cleanup

### Stop Applications

```bash
DEPLOY_ENV=dev make stop
```

### Destroy RDS Databases

```bash
cd infra/opentofu

# Plan destruction
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy

# Apply destruction
tofu apply tfplan_destroy
```

### Remove Local Configuration

```bash
# Remove OpenTofu state
rm -rf infra/opentofu/.terraform
rm infra/opentofu/terraform.tfstate*

# Clean Docker resources
docker system prune -a
```

## Automated Deployment Script

Use the provided script for automated deployment:

```bash
# Full deployment (init -> plan -> apply -> docker-start)
bash infra/scripts/deploy-dev-aws.sh full

# Step by step
bash infra/scripts/deploy-dev-aws.sh init
bash infra/scripts/deploy-dev-aws.sh plan
bash infra/scripts/deploy-dev-aws.sh apply
bash infra/scripts/deploy-dev-aws.sh outputs
bash infra/scripts/deploy-dev-aws.sh docker-start

# Manage Docker Compose
bash infra/scripts/deploy-dev-aws.sh docker-logs
bash infra/scripts/deploy-dev-aws.sh docker-stop

# Cleanup
bash infra/scripts/deploy-dev-aws.sh destroy
```

## Next Steps

1. **Setup CI/CD**: Configure GitHub Actions for auto-deployment
2. **Enable Monitoring**: Setup CloudWatch for RDS monitoring
3. **Configure Backups**: Enable automated RDS snapshots
4. **Security**: Configure VPC security groups and IAM policies
5. **Observability**: Setup local observability stack (Prometheus, Jaeger, Loki)

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [OpenTofu Documentation](https://opentofu.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [YCode Project README](../../README.md)
