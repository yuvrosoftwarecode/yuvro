# ⚡ Quick Start - 5 Minutes to Running

## 🎯 TL;DR

```bash
# 1. Verify RDS is accessible (optional)
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode -c "SELECT 1"

# 2. Start everything
DEPLOY_ENV=dev make install

# 3. Access applications
# YCode: http://localhost:3000
# YCampus: http://localhost:3002
```

## 📊 Infrastructure Status

| Component | Status | Details |
|-----------|--------|---------|
| VPC | ✅ Ready | vpc-0893533f938d45e9d (ap-south-1) |
| RDS YCode | ✅ Ready | dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com |
| RDS YCampus | ✅ Ready | dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com |
| S3 Buckets | ✅ Ready | App data & logs |
| Security Groups | ✅ Ready | Configured |

## 🔑 Database Credentials

**YCode Database:**
- Host: `dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com`
- Port: `5432`
- Database: `ycode`
- Username: `ycode_admin`
- Password: `ChangeMe123!DevPassword`

**YCampus Database:**
- Host: `dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com`
- Port: `5432`
- Database: `ycampus`
- Username: `ycampus_admin`
- Password: `ChangeMe123!DevPassword`

## 🚀 Start Services

```bash
# Start all services
DEPLOY_ENV=dev make install

# Start specific platform
DEPLOY_ENV=dev make install-ycode      # YCode only
DEPLOY_ENV=dev make install-ycampus    # YCampus only
```

## 🌐 Access Applications

| Service | URL |
|---------|-----|
| YCode Frontend | http://localhost:3000 |
| YCode Backend | http://localhost:8001 |
| YCampus Frontend | http://localhost:3002 |
| YCampus Backend | http://localhost:8003 |
| Code Executor | http://localhost:8002 |

## 📋 Common Commands

```bash
# View logs
DEPLOY_ENV=dev make logs

# Stop services
DEPLOY_ENV=dev make stop

# Clean up
DEPLOY_ENV=dev make clean

# Run migrations
DEPLOY_ENV=dev make makemigrations

# Load test data
DEPLOY_ENV=dev make load-fixtures-ycode

# Run tests
DEPLOY_ENV=dev make test-all

# Format code
DEPLOY_ENV=dev make format-all

# Lint code
DEPLOY_ENV=dev make lint-all
```

## 🔍 Verify Setup

```bash
# Check containers are running
docker compose ps

# Test backend health
curl http://localhost:8001/api/health
curl http://localhost:8003/api/health

# Check logs
DEPLOY_ENV=dev make logs
```

## ⚠️ Troubleshooting

**Can't connect to RDS?**
```bash
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode -c "SELECT 1"
```

**Port already in use?**
```bash
lsof -i :3000
kill -9 <PID>
```

**Containers won't start?**
```bash
DEPLOY_ENV=dev make logs
docker compose build --no-cache
```

## 📚 Full Documentation

- **Setup Guide**: `infra/SETUP_AND_START.md`
- **Deployment Guide**: `infra/DEPLOY_DEV_AWS.md`
- **Deployment Options**: `infra/DEPLOYMENT_OPTIONS.md`
- **Troubleshooting**: `infra/DEPLOY_DEV_AWS.md#troubleshooting`

## 💰 Cost

**~$8-10/month** for minimal dev environment (RDS only, no EC2)

## 🎉 Ready?

```bash
DEPLOY_ENV=dev make install
```

Then visit http://localhost:3000 🚀
