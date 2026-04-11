# 🚀 Setup and Start YCode Dev Environment

Your AWS RDS databases are deployed and ready! This guide walks you through the final setup steps to get the applications running locally with Docker Compose.

## ✅ Current Status

**Infrastructure Deployed:**
- ✅ VPC: `vpc-0893533f938d45e9d` (ap-south-1)
- ✅ RDS YCode: `dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432`
- ✅ RDS YCampus: `dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432`
- ✅ S3 Buckets: Created for app data and logs
- ✅ Security Groups: Configured for database access

**Environment Files Updated:**
- ✅ `ycode-backend-api/.env.dev` - Updated with RDS endpoint
- ✅ `ycampus-backend-api/.env.dev` - Updated with RDS endpoint
- ✅ `ycode-web/.env.dev` - Ready to use
- ✅ `ycampus-web/.env.dev` - Ready to use

## 📋 Prerequisites

### 1. Docker & Docker Compose

```bash
# macOS with Homebrew
brew install docker docker-compose

# Or download Docker Desktop
# https://www.docker.com/products/docker-desktop
```

Verify installation:
```bash
docker --version
docker compose --version
```

### 2. AWS CLI (Optional, for troubleshooting)

```bash
brew install awscli
aws configure  # Set region to ap-south-1
```

### 3. PostgreSQL Client (Optional, for database access)

```bash
brew install postgresql
```

## 🔧 Step 1: Verify RDS Connectivity

Test that your local machine can reach the RDS databases:

```bash
# Test YCode database
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin \
  -d ycode \
  -c "SELECT 1"

# Test YCampus database
psql -h dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycampus_admin \
  -d ycampus \
  -c "SELECT 1"
```

When prompted for password, enter: `ChangeMe123!DevPassword`

**Expected output:** `SELECT 1` returns `1`

### Troubleshooting Connection Issues

If you can't connect, the RDS security group may need your IP:

```bash
# Get your public IP
curl https://checkip.amazonaws.com

# Add your IP to RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr YOUR_IP/32 \
  --region ap-south-1
```

## 🐳 Step 2: Start Docker Compose

From the project root directory:

```bash
# Start all services
DEPLOY_ENV=dev make install

# Or start specific platforms
DEPLOY_ENV=dev make install-ycode      # YCode only
DEPLOY_ENV=dev make install-ycampus    # YCampus only
```

This will start:
- **YCode Frontend** (port 3000)
- **YCode Backend** (port 8001)
- **YCampus Frontend** (port 3002)
- **YCampus Backend** (port 8003)
- **Code Executor** (port 8002)

### Monitor Startup

```bash
# View logs in real-time
DEPLOY_ENV=dev make logs

# View specific service logs
docker compose logs ycode-backend-api -f
docker compose logs ycampus-backend-api -f
docker compose logs ycode-web -f
docker compose logs ycampus-web -f
```

### Wait for Services to Be Ready

Services typically take 30-60 seconds to start. Look for messages like:
- Backend: `Starting development server at http://0.0.0.0:8001`
- Frontend: `VITE v7.x.x ready in xxx ms`

## 🌐 Step 3: Access Applications

Once all services are running:

| Service | URL | Purpose |
|---------|-----|---------|
| YCode Frontend | http://localhost:3000 | Main learning platform |
| YCode Backend API | http://localhost:8001/api | API documentation |
| YCampus Frontend | http://localhost:3002 | Campus management |
| YCampus Backend API | http://localhost:8003/api | API documentation |
| Code Executor | http://localhost:8002 | Code execution service |

### Test Backend Health

```bash
# YCode backend
curl http://localhost:8001/api/health

# YCampus backend
curl http://localhost:8003/api/health
```

## 📊 Step 4: Database Setup (Optional)

### Run Migrations

```bash
# YCode migrations
DEPLOY_ENV=dev make makemigrations-ycode

# YCampus migrations
DEPLOY_ENV=dev make makemigrations-ycampus

# Or both
DEPLOY_ENV=dev make makemigrations
```

### Load Test Data

```bash
# Load YCode fixtures
DEPLOY_ENV=dev make load-fixtures-ycode

# Load YCampus fixtures
DEPLOY_ENV=dev make load-fixtures-ycampus
```

### Connect to Database Directly

```bash
# YCode database shell
DEPLOY_ENV=dev make db-shell-ycode

# YCampus database shell
DEPLOY_ENV=dev make db-shell-ycampus
```

## 🛑 Step 5: Stop Services

When you're done developing:

```bash
# Stop all services
DEPLOY_ENV=dev make stop

# Clean up containers and volumes
DEPLOY_ENV=dev make clean
```

## 📝 Common Commands

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# View logs
DEPLOY_ENV=dev make logs

# Run tests
DEPLOY_ENV=dev make test-all

# Format code
DEPLOY_ENV=dev make format-all

# Lint code
DEPLOY_ENV=dev make lint-all

# Database operations
DEPLOY_ENV=dev make makemigrations
DEPLOY_ENV=dev make migrate
DEPLOY_ENV=dev make load-fixtures-ycode
DEPLOY_ENV=dev make load-fixtures-ycampus

# Clean up
DEPLOY_ENV=dev make clean
```

## 🔍 Troubleshooting

### Issue: Containers won't start

```bash
# Check logs
DEPLOY_ENV=dev make logs

# Verify .env files exist
ls -la ycode-backend-api/.env.dev
ls -la ycampus-backend-api/.env.dev

# Rebuild containers
docker compose build --no-cache
```

### Issue: Can't connect to RDS

```bash
# Test connection
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode -c "SELECT 1"

# Check security group
aws ec2 describe-security-groups --region ap-south-1 \
  --query 'SecurityGroups[?Tags[?Key==`Environment` && Value==`dev`]]'
```

### Issue: Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: Database connection errors in logs

```bash
# Verify DATABASE_URL in .env.dev
cat ycode-backend-api/.env.dev | grep DATABASE_URL

# Test connection manually
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode
```

### Issue: Migrations fail

```bash
# Check database connection
docker compose exec ycode-backend-api python manage.py dbshell

# Run migrations manually
docker compose exec ycode-backend-api python manage.py migrate

# Check migration status
docker compose exec ycode-backend-api python manage.py showmigrations
```

## 📚 Environment Configuration

### YCode Backend (.env.dev)

```bash
DATABASE_URL=postgresql://ycode_admin:ChangeMe123!DevPassword@dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/ycode
DB_HOST=dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=ycode
DB_USER=ycode_admin
DB_PASSWORD=ChangeMe123!DevPassword
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
```

### YCampus Backend (.env.dev)

```bash
DATABASE_URL=postgresql://ycampus_admin:ChangeMe123!DevPassword@dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/ycampus
DB_HOST=dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=ycampus
DB_USER=ycampus_admin
DB_PASSWORD=ChangeMe123!DevPassword
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
```

### Frontend (.env.dev)

```bash
# YCode Frontend
VITE_BACKEND_API_BASE_URL=http://localhost:8001/api
VITE_CODE_EXECUTOR_BASE_URL=http://localhost:8002

# YCampus Frontend
VITE_BACKEND_API_BASE_URL=http://localhost:8003/api
VITE_CODE_EXECUTOR_BASE_URL=http://localhost:8002
```

## 💰 Cost Summary

**Monthly Estimated Cost: ~$8-10**

| Resource | Cost |
|----------|------|
| RDS YCode (db.t3.micro, 5GB) | ~$4 |
| RDS YCampus (db.t3.micro, 5GB) | ~$4 |
| Data Transfer | ~$1-2 |
| **Total** | **~$8-10** |

**Savings: ~70% vs EC2 + Kubernetes setup**

## 🔐 Security Notes

⚠️ **Development Only:**
- Default password: `ChangeMe123!DevPassword`
- Encryption disabled for cost savings
- No backups configured
- Public subnets only

**For Production:**
- Change database passwords
- Enable encryption
- Configure backups
- Use private subnets with NAT
- Enable VPC security best practices

## 📖 Next Steps

1. ✅ Verify RDS connectivity
2. ✅ Start Docker Compose: `DEPLOY_ENV=dev make install`
3. ✅ Access applications at localhost
4. ✅ Run migrations (optional): `DEPLOY_ENV=dev make makemigrations`
5. ✅ Load test data (optional): `DEPLOY_ENV=dev make load-fixtures-ycode`
6. ✅ Start developing!

## 📞 Support

For issues or questions:
- Check logs: `DEPLOY_ENV=dev make logs`
- Review troubleshooting section above
- Check `.env.dev` files for correct configuration
- Verify RDS connectivity with psql

## 🎉 You're Ready!

Your development environment is now ready. Start building!

```bash
DEPLOY_ENV=dev make install
```

Access your applications:
- **YCode**: http://localhost:3000
- **YCampus**: http://localhost:3002

Happy coding! 🚀
