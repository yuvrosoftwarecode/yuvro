# 🎯 START NOW - Copy & Paste Commands

Your infrastructure is ready. Here are the exact commands to run.

## ✅ Prerequisites Check

```bash
# Verify Docker is installed
docker --version

# Verify Docker Compose is installed
docker compose --version

# Verify project files exist
ls -la ycode-backend-api/.env.dev
ls -la ycampus-backend-api/.env.dev
```

## 🚀 Start Everything (One Command)

```bash
DEPLOY_ENV=dev make install
```

**That's it!** This will:
- Pull Docker images
- Start all containers
- Connect to RDS databases
- Initialize all services

**Wait 30-60 seconds for services to start...**

## 🌐 Access Your Applications

Once running, open these URLs in your browser:

```
YCode Frontend:     http://localhost:3000
YCode Backend:      http://localhost:8001
YCampus Frontend:   http://localhost:3002
YCampus Backend:    http://localhost:8003
Code Executor:      http://localhost:8002
```

## 📊 Verify Services Are Running

```bash
# Check all containers
docker compose ps

# Test YCode backend
curl http://localhost:8001/api/health

# Test YCampus backend
curl http://localhost:8003/api/health

# View logs
DEPLOY_ENV=dev make logs
```

## 🛑 Stop Services

```bash
DEPLOY_ENV=dev make stop
```

## 🔄 Restart Services

```bash
DEPLOY_ENV=dev make stop
DEPLOY_ENV=dev make install
```

## 🧹 Clean Up Everything

```bash
DEPLOY_ENV=dev make clean
```

## 📋 Optional: Database Setup

### Run Migrations

```bash
# YCode migrations
DEPLOY_ENV=dev make makemigrations-ycode

# YCampus migrations
DEPLOY_ENV=dev make makemigrations-ycampus

# Both
DEPLOY_ENV=dev make makemigrations
```

### Load Test Data

```bash
# YCode test data
DEPLOY_ENV=dev make load-fixtures-ycode

# YCampus test data
DEPLOY_ENV=dev make load-fixtures-ycampus
```

### Connect to Database

```bash
# YCode database
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode

# YCampus database
psql -h dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycampus_admin -d ycampus

# Password: ChangeMe123!DevPassword
```

## 🔍 Troubleshooting Commands

### View Logs

```bash
# All services
DEPLOY_ENV=dev make logs

# Specific service
docker compose logs ycode-backend-api -f
docker compose logs ycampus-backend-api -f
docker compose logs ycode-web -f
docker compose logs ycampus-web -f
```

### Check Container Status

```bash
# List all containers
docker compose ps

# Inspect specific container
docker compose exec ycode-backend-api bash

# View container logs
docker compose logs ycode-backend-api
```

### Test Database Connection

```bash
# YCode database
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode -c "SELECT 1"

# YCampus database
psql -h dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycampus_admin -d ycampus -c "SELECT 1"
```

### Fix Port Conflicts

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or kill all Docker containers
docker compose down
```

## 📝 All Available Commands

```bash
# Installation & Setup
DEPLOY_ENV=dev make install              # Start all services
DEPLOY_ENV=dev make install-ycode        # Start YCode only
DEPLOY_ENV=dev make install-ycampus      # Start YCampus only

# Service Management
DEPLOY_ENV=dev make stop                 # Stop all services
DEPLOY_ENV=dev make clean                # Clean up containers
DEPLOY_ENV=dev make logs                 # View logs

# Database Operations
DEPLOY_ENV=dev make makemigrations       # Create migrations
DEPLOY_ENV=dev make migrate              # Run migrations
DEPLOY_ENV=dev make load-fixtures-ycode  # Load YCode test data
DEPLOY_ENV=dev make load-fixtures-ycampus # Load YCampus test data

# Code Quality
DEPLOY_ENV=dev make test-all             # Run all tests
DEPLOY_ENV=dev make format-all           # Format code
DEPLOY_ENV=dev make lint-all             # Lint code
DEPLOY_ENV=dev make check-all            # Run all checks

# Specific Services
DEPLOY_ENV=dev make backend-test         # Test backend
DEPLOY_ENV=dev make frontend-test        # Test frontend
DEPLOY_ENV=dev make backend-format-fix   # Format backend
DEPLOY_ENV=dev make frontend-format-fix  # Format frontend
```

## 🎯 Quick Workflow

```bash
# 1. Start services
DEPLOY_ENV=dev make install

# 2. Wait for services to start (30-60 seconds)
# Watch logs: DEPLOY_ENV=dev make logs

# 3. Access applications
# YCode: http://localhost:3000
# YCampus: http://localhost:3002

# 4. Run migrations (optional)
DEPLOY_ENV=dev make makemigrations

# 5. Load test data (optional)
DEPLOY_ENV=dev make load-fixtures-ycode

# 6. Start developing!

# 7. When done, stop services
DEPLOY_ENV=dev make stop
```

## 📊 Infrastructure Details

**RDS Databases:**
- YCode: `dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432`
- YCampus: `dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432`

**Credentials:**
- Username: `ycode_admin` / `ycampus_admin`
- Password: `ChangeMe123!DevPassword`

**VPC:**
- ID: `vpc-0893533f938d45e9d`
- Region: `ap-south-1`

**Cost:**
- ~$8-10/month

## 🎉 That's It!

You're ready to go. Run this command:

```bash
DEPLOY_ENV=dev make install
```

Then visit http://localhost:3000 🚀

---

**Need help?** Check `infra/SETUP_AND_START.md` for detailed troubleshooting.
