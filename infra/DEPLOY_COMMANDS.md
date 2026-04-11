# Deploy Commands - Copy & Paste Ready

## Option 1: Local Docker Compose Only

```bash
# Start everything locally
DEPLOY_ENV=dev make install

# Access at http://localhost:3000
```

---

## Option 2: Docker Compose + RDS (Single AZ) ✅ RECOMMENDED

### Step 1: Deploy RDS Infrastructure

```bash
cd infra/opentofu
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan
```

### Step 2: Get RDS Endpoints

```bash
tofu output
```

**Save the output values:**
- `ycode_db_endpoint`
- `ycampus_db_endpoint`

### Step 3: Configure Environment Files

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
cd ../..
DEPLOY_ENV=dev make install
```

### Step 5: Access Applications

- YCode: http://localhost:3000
- YCampus: http://localhost:3002

---

## Option 3: Docker Compose + RDS (Multi-AZ)

### Step 1: Edit Configuration

```bash
# Edit infra/opentofu/dev.tfvars
# Change: multi_az = true
# Change: ycode_db_allocated_storage = 10
# Change: ycampus_db_allocated_storage = 10
```

### Step 2: Deploy RDS

```bash
cd infra/opentofu
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan
```

### Step 3: Get Endpoints & Configure

```bash
tofu output
# Copy endpoints to .env files (same as Option 2)
```

### Step 4: Start Docker Compose

```bash
cd ../..
DEPLOY_ENV=dev make install
```

---

## Common Operations

### View Logs

```bash
DEPLOY_ENV=dev make logs
```

### Stop Services

```bash
DEPLOY_ENV=dev make stop
```

### Run Migrations

```bash
DEPLOY_ENV=dev make makemigrations
```

### Load Test Data

```bash
DEPLOY_ENV=dev make load-fixtures-ycode
DEPLOY_ENV=dev make load-fixtures-ycampus
```

### Run Tests

```bash
DEPLOY_ENV=dev make test-all
```

### Format Code

```bash
DEPLOY_ENV=dev make format-all
```

### Lint Code

```bash
DEPLOY_ENV=dev make lint-all
```

### Clean Up

```bash
DEPLOY_ENV=dev make clean
```

---

## Database Operations

### Connect to YCode Database

```bash
psql -h <ycode_db_endpoint> -U ycode_admin -d ycode
```

### Connect to YCampus Database

```bash
psql -h <ycampus_db_endpoint> -U ycampus_admin -d ycampus
```

### Connect via Docker (Local)

```bash
docker compose exec yc-db psql -U ycode_admin -d ycode
docker compose exec ycampus-db psql -U ycampus_admin -d ycampus
```

---

## Cleanup Operations

### Stop Docker Compose

```bash
DEPLOY_ENV=dev make stop
```

### Remove Containers & Volumes

```bash
DEPLOY_ENV=dev make clean
```

### Destroy RDS Infrastructure

```bash
cd infra/opentofu
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy
```

### Remove OpenTofu State

```bash
rm -rf infra/opentofu/.terraform
rm infra/opentofu/terraform.tfstate*
```

### Clean Docker System

```bash
docker system prune -a
```

---

## Troubleshooting Commands

### Check Container Status

```bash
docker compose ps
```

### View Specific Service Logs

```bash
docker compose logs yc-backend-api -f
docker compose logs ycampus-backend-api -f
docker compose logs yc-db -f
```

### Find Process Using Port

```bash
lsof -i :3000
lsof -i :8001
lsof -i :8003
```

### Kill Process

```bash
kill -9 <PID>
```

### Rebuild Containers

```bash
docker compose build --no-cache
```

### Test Backend Health

```bash
curl http://localhost:8001/api/health
curl http://localhost:8003/api/health
```

### Verify RDS Connection

```bash
tofu output ycode_db_endpoint
psql -h <endpoint> -U ycode_admin -d ycode
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start (Local) | `DEPLOY_ENV=dev make install` |
| Start (RDS) | `cd infra/opentofu && tofu apply tfplan` |
| Stop | `DEPLOY_ENV=dev make stop` |
| Logs | `DEPLOY_ENV=dev make logs` |
| Migrations | `DEPLOY_ENV=dev make makemigrations` |
| Tests | `DEPLOY_ENV=dev make test-all` |
| Cleanup | `DEPLOY_ENV=dev make clean` |
| RDS Destroy | `cd infra/opentofu && tofu apply tfplan_destroy` |

---

## Recommended: Option 2

```bash
# Deploy RDS
cd infra/opentofu
tofu apply tfplan

# Get endpoints
tofu output

# Configure .env files
# (Copy endpoints from output)

# Start Docker Compose
cd ../..
DEPLOY_ENV=dev make install

# Access at http://localhost:3000
```

---

## Ready?

Pick an option and copy the commands above!

**Recommended**: Option 2 (Docker + RDS Single AZ)

Let's go! 🚀
