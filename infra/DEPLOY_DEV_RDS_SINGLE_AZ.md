# Deploy YCode Dev Environment - Docker Compose + RDS (Single AZ)

Hybrid approach: Docker Compose locally + AWS RDS in single AZ for minimal cost.

## Architecture

```
Local Machine (Docker Compose)          AWS ap-south-1 (Single AZ)
├── YCode Frontend (3000)               ├── RDS YCode DB (db.t3.micro)
├── YCode Backend (8001)                └── RDS YCampus DB (db.t3.micro)
├── YCampus Frontend (3002)
├── YCampus Backend (8003)
└── Code Executor (8002)
```

## Quick Deploy (10 minutes)

### Step 1: Deploy RDS Infrastructure

```bash
cd infra/opentofu

# Plan deployment
tofu plan -var-file=dev.tfvars -out=tfplan

# Apply (creates RDS in ap-south-1, single AZ)
tofu apply tfplan
```

**Expected**: Plan: 4 to add, 5 to change, 0 to destroy

**Time**: 5-10 minutes

### Step 2: Get RDS Endpoints

```bash
# Display outputs
tofu output

# Or get specific values
tofu output -raw ycode_db_endpoint
tofu output -raw ycampus_db_endpoint
```

**Save these values** for the next step.

### Step 3: Configure Environment Files

Update `.env.dev` files with RDS endpoints:

**yc-backend-api/.env.dev**
```bash
DATABASE_URL=postgresql://ycode_admin:ChangeMe123!DevPassword@<ycode_db_endpoint>:5432/ycode
DB_HOST=<ycode_db_endpoint>
DB_PORT=5432
DB_NAME=ycode
DB_USER=ycode_admin
DB_PASSWORD=ChangeMe123!DevPassword
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
DEPLOY_ENV=dev
```

**ycampus-backend-api/.env.dev**
```bash
DATABASE_URL=postgresql://ycampus_admin:ChangeMe123!DevPassword@<ycampus_db_endpoint>:5432/ycampus
DB_HOST=<ycampus_db_endpoint>
DB_PORT=5432
DB_NAME=ycampus
DB_USER=ycampus_admin
DB_PASSWORD=ChangeMe123!DevPassword
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
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

### Step 4: Start Docker Compose

```bash
# From project root
cd ../..

# Start all services
DEPLOY_ENV=dev make install

# Wait for containers to start (2-3 minutes)
```

### Step 5: Verify Deployment

```bash
# Check containers
docker compose ps

# View logs
DEPLOY_ENV=dev make logs

# Test backend
curl http://localhost:8001/api/health
curl http://localhost:8003/api/health
```

### Step 6: Access Applications

- **YCode Frontend**: http://localhost:3000
- **YCode Backend**: http://localhost:8001
- **YCampus Frontend**: http://localhost:3002
- **YCampus Backend**: http://localhost:8003

## Configuration Details

**dev.tfvars**:
- Region: ap-south-1 (India)
- Single AZ: ap-south-1a
- Public subnets only
- RDS: db.t3.micro (2GB storage, 5GB max)
- Backups: 0 days (no backups)
- Multi-AZ: false (single AZ)

## Cost Estimation

**Monthly costs**:

| Resource | Cost |
|----------|------|
| RDS YCode (db.t3.micro, 2GB) | ~$5 |
| RDS YCampus (db.t3.micro, 2GB) | ~$5 |
| Data Transfer | ~$1 |
| Storage | ~$0.50 |
| **Total** | **~$11-12** |

**Comparison**:
- Local Docker only: $0/month
- Docker + RDS (single AZ): ~$11-12/month
- Docker + RDS (multi-AZ): ~$20-25/month
- EC2 + RDS + Kubernetes: ~$35-40/month

## Common Commands

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Database
psql -h <endpoint> -U ycode_admin -d ycode

# Migrations
DEPLOY_ENV=dev make makemigrations

# Load test data
DEPLOY_ENV=dev make load-fixtures-ycode
DEPLOY_ENV=dev make load-fixtures-ycampus

# Tests
DEPLOY_ENV=dev make test-all

# Cleanup
DEPLOY_ENV=dev make clean
```

## Troubleshooting

### RDS Connection Failed

```bash
# Verify endpoint
tofu output ycode_db_endpoint

# Test connection
psql -h <endpoint> -U ycode_admin -d ycode

# Add your IP to security group
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr <your-ip>/32 \
  --region ap-south-1
```

### Docker Containers Won't Start

```bash
# Check logs
DEPLOY_ENV=dev make logs

# Verify .env files
cat yc-backend-api/.env.dev

# Rebuild
docker compose build --no-cache
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

## Cleanup

### Stop Applications

```bash
DEPLOY_ENV=dev make stop
```

### Destroy RDS

```bash
cd infra/opentofu

# Plan destruction
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy

# Apply destruction
tofu apply tfplan_destroy
```

### Remove State

```bash
rm -rf infra/opentofu/.terraform
rm infra/opentofu/terraform.tfstate*
docker system prune -a
```

## Scaling

### Increase Storage

Edit `infra/opentofu/dev.tfvars`:
```bash
ycode_db_allocated_storage = 10
ycampus_db_allocated_storage = 10
```

Then apply:
```bash
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

### Upgrade Instance Type

Edit `infra/opentofu/dev.tfvars`:
```bash
ycode_db_instance_class = "db.t3.small"
ycampus_db_instance_class = "db.t3.small"
```

Then apply:
```bash
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

## Next Steps

1. Deploy RDS: `cd infra/opentofu && tofu apply tfplan`
2. Get endpoints: `tofu output`
3. Configure .env files
4. Start Docker Compose: `DEPLOY_ENV=dev make install`
5. Access applications at localhost

## Documentation

- **Local Only**: `infra/DEPLOY_DEV_LOCAL_ONLY.md`
- **Recommended**: `infra/DEPLOY_RECOMMENDED.md`
- **Start Here**: `infra/START_HERE.md`
- **Fixes Applied**: `infra/FIXES_APPLIED.md`

## Ready?

```bash
cd infra/opentofu
tofu apply tfplan
```

Let's go! 🚀
