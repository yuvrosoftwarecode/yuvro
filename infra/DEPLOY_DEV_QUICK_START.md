# Quick Start: Dev Environment (Docker Compose + AWS RDS)

## TL;DR - 10 Minute Setup

### Prerequisites (one-time)
```bash
# Install tools
brew install docker awscli postgresql

# Configure AWS
aws configure
# Enter AWS credentials, region: ap-south-1
```

### Deploy RDS Databases
```bash
cd infra/opentofu

# Initialize
tofu init

# Deploy
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan

# Get endpoints
tofu output
```

### Configure Environment
```bash
# Copy RDS endpoints from tofu output
# Update .env files:
# - yc-backend-api/.env.dev
# - ycampus-backend-api/.env.dev
# - yc-code-executor/.env.dev
# - ycampus-web/.env.dev
# - yc-web/.env.dev

# Set DATABASE_URL and DB_HOST to RDS endpoints
```

### Start Applications
```bash
cd ../..

# Start all services
DEPLOY_ENV=dev make install

# Or specific platform
DEPLOY_ENV=dev make install-ycode
DEPLOY_ENV=dev make install-ycampus
```

### Access Applications
```bash
# YCode
open http://localhost:3000

# YCampus
open http://localhost:3002
```

## Common Commands

```bash
# Start services
DEPLOY_ENV=dev make install

# Stop services
DEPLOY_ENV=dev make stop

# View logs
DEPLOY_ENV=dev make logs

# Run migrations
DEPLOY_ENV=dev make makemigrations

# Load test data
DEPLOY_ENV=dev make load-fixtures-ycode
DEPLOY_ENV=dev make load-fixtures-ycampus

# Run tests
DEPLOY_ENV=dev make test-all

# Format code
DEPLOY_ENV=dev make format-all

# Lint code
DEPLOY_ENV=dev make lint-all
```

## Database Access

```bash
# Connect to YCode database
psql -h <ycode_db_endpoint> -U ycode_admin -d ycode

# Connect to YCampus database
psql -h <ycampus_db_endpoint> -U ycampus_admin -d ycampus
```

## Cost

**~$11-12/month** (RDS only, minimal storage, no backups)

## Troubleshooting

### Can't connect to RDS
```bash
# Check endpoint is correct
tofu output ycode_db_endpoint

# Verify credentials
psql -h <endpoint> -U ycode_admin -d ycode

# Check security group allows your IP
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr <your-ip>/32 \
  --region ap-south-1
```

### Port already in use
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Docker containers can't reach RDS
```bash
# Check Docker network
docker network ls

# Verify RDS security group inbound rules
aws ec2 describe-security-groups --region ap-south-1
```

## Full Documentation

See `infra/DEPLOY_DEV_DOCKER_RDS.md` for detailed guide.

## Cleanup

```bash
# Stop applications
DEPLOY_ENV=dev make stop

# Destroy RDS
cd infra/opentofu
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy
```
