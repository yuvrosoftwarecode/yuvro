# Deploy YCode Dev Environment with Docker Compose + AWS RDS

This guide deploys YCode and YCampus applications locally using Docker Compose, with databases hosted on AWS RDS in ap-south-1 (India region).

## Architecture

```
Local Machine (Docker Compose)          AWS (ap-south-1)
├── YCode Frontend (port 3000)          ├── RDS YCode DB
├── YCode Backend (port 8001)           └── RDS YCampus DB
├── YCampus Frontend (port 3002)
├── YCampus Backend (port 8003)
└── Code Executor (port 8002)
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

1. **AWS Account** (if you don't have one)
   - Go to https://aws.amazon.com/
   - Click "Create an AWS Account"

2. **Configure AWS Credentials**
   ```bash
   aws configure
   ```
   You'll be prompted for:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `ap-south-1`
   - Default output format: `json`

3. **Verify AWS Credentials**
   ```bash
   aws sts get-caller-identity
   ```

## Deployment Steps

### Step 1: Create RDS Databases with OpenTofu

```bash
cd infra/opentofu

# Initialize OpenTofu
tofu init

# Plan deployment
tofu plan -var-file=dev.tfvars -out=tfplan

# Apply configuration (creates RDS instances)
tofu apply tfplan
```

This creates:
- VPC with public subnets in ap-south-1
- 2x db.t3.micro RDS PostgreSQL instances (YCode and YCampus)
- Security groups for RDS access

### Step 2: Retrieve RDS Endpoints

```bash
# Get database endpoints and credentials
tofu output

# Save these values:
# - ycode_db_endpoint
# - ycode_db_username
# - ycode_db_password
# - ycampus_db_endpoint
# - ycampus_db_username
# - ycampus_db_password
```

### Step 3: Configure Environment Files

Update the `.env` files for each service with RDS endpoints:

**yc-backend-api/.env.dev**
```bash
# Database
DATABASE_URL=postgresql://ycode_admin:ChangeMe123!DevPassword@<ycode_db_endpoint>:5432/ycode
DB_HOST=<ycode_db_endpoint>
DB_PORT=5432
DB_NAME=ycode
DB_USER=ycode_admin
DB_PASSWORD=ChangeMe123!DevPassword

# Other settings
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

**ycampus-backend-api/.env.dev**
```bash
# Database
DATABASE_URL=postgresql://ycampus_admin:ChangeMe123!DevPassword@<ycampus_db_endpoint>:5432/ycampus
DB_HOST=<ycampus_db_endpoint>
DB_PORT=5432
DB_NAME=ycampus
DB_USER=ycampus_admin
DB_PASSWORD=ChangeMe123!DevPassword

# Other settings
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
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

# Test connectivity
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
# Install PostgreSQL client
brew install postgresql

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
aws ec2 describe-security-groups --region ap-south-1 --query 'SecurityGroups[?Tags[?Key==`Environment` && Value==`dev`]]'

# Verify credentials
psql -h <rds_endpoint> -U ycode_admin -d ycode
```

### Issue: Docker containers can't reach RDS

```bash
# Check Docker network
docker network ls

# Verify RDS security group allows Docker host IP
# Add your local IP to RDS security group inbound rules
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

# Or use different port
docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.dev.yml up -p 3001:3000
```

## Cost Estimation

**Monthly costs for dev environment:**

| Resource | Type | Cost |
|----------|------|------|
| RDS YCode | db.t3.micro | ~$10 |
| RDS YCampus | db.t3.micro | ~$10 |
| Data Transfer | Outbound | ~$2 |
| Storage | 20GB | ~$1 |
| **Total** | | **~$23/month** |

**Comparison:**
- Dev with EC2 + RDS: ~$35-40/month
- Dev with Docker Compose + RDS: ~$23/month
- **Savings: ~35%**

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
