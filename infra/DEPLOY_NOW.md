# Deploy YCode Dev Environment Now

All issues have been fixed. You can now deploy the dev environment.

## Quick Deploy (5 minutes)

### Step 1: Deploy RDS Infrastructure

```bash
cd infra/opentofu

# Plan deployment
tofu plan -var-file=dev.tfvars -out=tfplan

# Apply (creates RDS databases in ap-south-1)
tofu apply tfplan
```

**Expected output**: `Plan: 58 to add, 0 to change, 0 to destroy`

**Time**: 5-10 minutes

### Step 2: Get RDS Endpoints

```bash
# Display all outputs
tofu output

# Or get specific values
tofu output -raw ycode_db_endpoint
tofu output -raw ycampus_db_endpoint
```

**Save these values** - you'll need them for the next step.

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

# Verify .env files are correct
cat yc-backend-api/.env.dev

# Rebuild containers
docker compose build --no-cache
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

## Cost

**~$11-12/month** for dev environment

- RDS YCode: ~$5
- RDS YCampus: ~$5
- Data transfer: ~$1
- Storage: ~$0.50

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

# Tests
DEPLOY_ENV=dev make test-all

# Cleanup
DEPLOY_ENV=dev make clean
```

## Cleanup (When Done)

```bash
# Stop applications
DEPLOY_ENV=dev make stop

# Destroy RDS
cd infra/opentofu
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy

# Remove state
rm -rf .terraform
rm terraform.tfstate*
```

## What Was Fixed

See `infra/FIXES_APPLIED.md` for details on:
- RDS module attribute fixes
- S3 lifecycle configuration fixes
- Variables validation updates

## Documentation

- **Full Guide**: `infra/DEPLOY_DEV_AWS.md`
- **Quick Start**: `infra/DEPLOY_DEV_QUICK_START.md`
- **Summary**: `infra/DEV_DEPLOYMENT_SUMMARY.md`
- **Checklist**: `infra/DEV_DEPLOYMENT_CHECKLIST.md`
- **Fixes**: `infra/FIXES_APPLIED.md`

## Ready to Deploy?

```bash
cd infra/opentofu
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan
```

Good luck! 🚀
