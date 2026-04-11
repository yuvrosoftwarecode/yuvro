# ✅ Ready to Deploy - RDS Created Successfully

## RDS Endpoints

✅ **YCode Database**
- Endpoint: `dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com`
- Port: `5432`
- Database: `ycode`
- Username: `ycode_admin`
- Password: `ChangeMe123!DevPassword`

✅ **YCampus Database**
- Endpoint: `dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com`
- Port: `5432`
- Database: `ycampus`
- Username: `ycampus_admin`
- Password: `ChangeMe123!DevPassword`

## Step 1: Configure Environment Files

### yc-backend-api/.env.dev
```bash
DATABASE_URL=postgresql://ycode_admin:ChangeMe123!DevPassword@dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/ycode
DB_HOST=dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=ycode
DB_USER=ycode_admin
DB_PASSWORD=ChangeMe123!DevPassword
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
DEPLOY_ENV=dev
SECRET_KEY=your-secret-key-here
```

### ycampus-backend-api/.env.dev
```bash
DATABASE_URL=postgresql://ycampus_admin:ChangeMe123!DevPassword@dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/ycampus
DB_HOST=dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=ycampus
DB_USER=ycampus_admin
DB_PASSWORD=ChangeMe123!DevPassword
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
DEPLOY_ENV=dev
SECRET_KEY=your-secret-key-here
```

### yc-web/.env.dev
```bash
VITE_API_URL=http://localhost:8001
VITE_DEPLOY_ENV=dev
```

### ycampus-web/.env.dev
```bash
VITE_API_URL=http://localhost:8003
VITE_DEPLOY_ENV=dev
```

### yc-code-executor/.env.dev
```bash
DEBUG=True
DEPLOY_ENV=dev
```

## Step 2: Start Docker Compose

```bash
# From project root
DEPLOY_ENV=dev make install
```

This will start:
- YCode Frontend (port 3000)
- YCode Backend (port 8001)
- YCampus Frontend (port 3002)
- YCampus Backend (port 8003)
- Code Executor (port 8002)

## Step 3: Access Applications

- **YCode Frontend**: http://localhost:3000
- **YCode Backend API**: http://localhost:8001
- **YCampus Frontend**: http://localhost:3002
- **YCampus Backend API**: http://localhost:8003

## Step 4: Run Migrations (Optional)

```bash
# YCode migrations
DEPLOY_ENV=dev make makemigrations-ycode

# YCampus migrations
DEPLOY_ENV=dev make makemigrations-ycampus
```

## Step 5: Load Test Data (Optional)

```bash
# Load YCode test data
DEPLOY_ENV=dev make load-fixtures-ycode

# Load YCampus test data
DEPLOY_ENV=dev make load-fixtures-ycampus
```

## Verify RDS Connection

```bash
# Test YCode database
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com -U ycode_admin -d ycode -c "SELECT 1"

# Test YCampus database
psql -h dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com -U ycampus_admin -d ycampus -c "SELECT 1"
```

## Common Commands

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Migrations
DEPLOY_ENV=dev make makemigrations

# Tests
DEPLOY_ENV=dev make test-all

# Format code
DEPLOY_ENV=dev make format-all

# Lint code
DEPLOY_ENV=dev make lint-all

# Cleanup
DEPLOY_ENV=dev make clean
```

## Infrastructure Summary

✅ **VPC**: vpc-0893533f938d45e9d
- Region: ap-south-1
- AZs: ap-south-1a, ap-south-1b
- Public Subnets: 2

✅ **RDS Instances**: 2x db.t3.micro
- Storage: 5GB gp2 (minimal cost)
- Encryption: Disabled (dev)
- Backups: 0 days
- Multi-AZ: false

✅ **Security Groups**: Configured
- RDS: Allows PostgreSQL from Docker
- VPC: Allows all outbound

✅ **S3 Buckets**: 2
- App data bucket
- Logs bucket

✅ **IAM Roles**: Configured
- App service role
- Kubernetes node role

## Cost

**Estimated Monthly**: ~$8-10
- RDS YCode: ~$4
- RDS YCampus: ~$4
- Data transfer: ~$1-2

## Troubleshooting

### Can't connect to RDS

```bash
# Verify endpoint
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com -U ycode_admin -d ycode

# Check security group
aws ec2 describe-security-groups --region ap-south-1 --query 'SecurityGroups[?Tags[?Key==`Environment` && Value==`dev`]]'

# Add your IP to security group
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr <your-ip>/32 \
  --region ap-south-1
```

### Docker containers won't start

```bash
# Check logs
DEPLOY_ENV=dev make logs

# Verify .env files
cat yc-backend-api/.env.dev

# Rebuild
docker compose build --no-cache
```

### Port already in use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

## Next Steps

1. ✅ Configure .env files (copy endpoints above)
2. ✅ Start Docker Compose: `DEPLOY_ENV=dev make install`
3. ✅ Access applications at localhost
4. ✅ Run migrations (optional)
5. ✅ Load test data (optional)
6. ✅ Start developing!

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

## Documentation

- `infra/START_HERE.md` - Quick overview
- `infra/DEPLOY_DEV_RDS_SINGLE_AZ.md` - Full guide
- `infra/DEPLOY_COMMANDS.md` - Copy-paste commands
- `infra/DEPLOYMENT_OPTIONS.md` - Comparison
- `infra/FIXES_APPLIED.md` - Technical details

## Ready?

```bash
# Configure .env files with endpoints above
# Then run:
DEPLOY_ENV=dev make install

# Access at http://localhost:3000
```

Let's go! 🚀
