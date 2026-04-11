# 📚 YCode Dev Environment - Complete Documentation

Your AWS infrastructure is deployed and ready! This directory contains all documentation for managing your development environment.

## 🚀 Quick Links

### I Want To...

| Goal | Document | Time |
|------|----------|------|
| **Start developing NOW** | [`START_NOW.md`](START_NOW.md) | 5 min |
| **Quick reference** | [`QUICK_START.md`](QUICK_START.md) | 2 min |
| **Complete setup guide** | [`SETUP_AND_START.md`](SETUP_AND_START.md) | 15 min |
| **Understand deployment** | [`DEPLOY_DEV_AWS.md`](DEPLOY_DEV_AWS.md) | 20 min |
| **See all options** | [`DEPLOYMENT_OPTIONS.md`](DEPLOYMENT_OPTIONS.md) | 10 min |
| **Copy-paste commands** | [`DEPLOY_COMMANDS.md`](DEPLOY_COMMANDS.md) | 5 min |
| **Verify everything** | [`DEPLOYMENT_COMPLETE.md`](DEPLOYMENT_COMPLETE.md) | 10 min |

## 📋 Document Overview

### 🟢 START HERE

**[`START_NOW.md`](START_NOW.md)** - Copy & Paste Commands
- Exact commands to run
- No explanations, just commands
- Perfect for experienced developers
- **Time: 5 minutes**

```bash
DEPLOY_ENV=dev make install
```

---

### 🟡 QUICK REFERENCE

**[`QUICK_START.md`](QUICK_START.md)** - 5-Minute Quick Start
- Infrastructure status
- Database credentials
- Common commands
- Quick troubleshooting
- **Time: 2 minutes**

---

### 🔵 DETAILED GUIDES

**[`SETUP_AND_START.md`](SETUP_AND_START.md)** - Complete Setup Guide
- Prerequisites installation
- Step-by-step setup
- Detailed troubleshooting
- Database operations
- **Time: 15 minutes**

**[`DEPLOY_DEV_AWS.md`](DEPLOY_DEV_AWS.md)** - Full Deployment Documentation
- Architecture overview
- Prerequisites
- Deployment steps
- Database management
- Cost estimation
- Scaling options
- **Time: 20 minutes**

**[`DEPLOYMENT_OPTIONS.md`](DEPLOYMENT_OPTIONS.md)** - Deployment Alternatives
- Option 1: Docker Compose + RDS (Recommended)
- Option 2: Docker Compose Only (Local)
- Option 3: Kubernetes + RDS (Production)
- Comparison table
- **Time: 10 minutes**

**[`DEPLOY_COMMANDS.md`](DEPLOY_COMMANDS.md)** - Copy-Paste Commands
- All available commands
- Organized by category
- Ready to copy and paste
- **Time: 5 minutes**

**[`DEPLOYMENT_COMPLETE.md`](DEPLOYMENT_COMPLETE.md)** - Verification Checklist
- What's been done
- Next steps
- Verification commands
- Troubleshooting
- **Time: 10 minutes**

---

### 🟣 REFERENCE

**[`DEPLOY_DEV_RDS_SINGLE_AZ.md`](DEPLOY_DEV_RDS_SINGLE_AZ.md)** - RDS Configuration Details
- RDS setup details
- Single AZ configuration
- Database endpoints
- Credentials

**[`DEPLOYMENT_STATUS.md`](DEPLOYMENT_STATUS.md)** - Current Status
- Infrastructure status
- What's deployed
- Next steps

**[`FIXES_APPLIED.md`](FIXES_APPLIED.md)** - Technical Details
- OpenTofu fixes applied
- Configuration changes
- Troubleshooting history

---

## 🎯 Getting Started (3 Steps)

### Step 1: Prerequisites
```bash
# Install Docker
brew install docker docker-compose

# Verify installation
docker --version
docker compose --version
```

### Step 2: Start Services
```bash
# From project root
DEPLOY_ENV=dev make install
```

### Step 3: Access Applications
```
YCode:    http://localhost:3000
YCampus:  http://localhost:3002
```

## 📊 Infrastructure Status

| Component | Status | Details |
|-----------|--------|---------|
| **VPC** | ✅ Ready | vpc-0893533f938d45e9d (ap-south-1) |
| **RDS YCode** | ✅ Ready | dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com |
| **RDS YCampus** | ✅ Ready | dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com |
| **S3 Buckets** | ✅ Ready | App data & logs |
| **Security Groups** | ✅ Ready | Configured |
| **Environment Files** | ✅ Ready | Updated with RDS endpoints |

## 🔑 Database Credentials

**YCode:**
- Host: `dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com`
- Port: `5432`
- Database: `ycode`
- Username: `ycode_admin`
- Password: `ChangeMe123!DevPassword`

**YCampus:**
- Host: `dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com`
- Port: `5432`
- Database: `ycampus`
- Username: `ycampus_admin`
- Password: `ChangeMe123!DevPassword`

## 🌐 Application URLs

| Service | URL | Port |
|---------|-----|------|
| YCode Frontend | http://localhost:3000 | 3000 |
| YCode Backend | http://localhost:8001 | 8001 |
| YCampus Frontend | http://localhost:3002 | 3002 |
| YCampus Backend | http://localhost:8003 | 8003 |
| Code Executor | http://localhost:8002 | 8002 |

## 📝 Common Commands

```bash
# Start all services
DEPLOY_ENV=dev make install

# Stop all services
DEPLOY_ENV=dev make stop

# View logs
DEPLOY_ENV=dev make logs

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

# Clean up
DEPLOY_ENV=dev make clean
```

## 🔍 Troubleshooting

### Can't connect to RDS?
```bash
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U ycode_admin -d ycode -c "SELECT 1"
```

### Port already in use?
```bash
lsof -i :3000
kill -9 <PID>
```

### Containers won't start?
```bash
DEPLOY_ENV=dev make logs
docker compose build --no-cache
```

### Need more help?
See [`SETUP_AND_START.md`](SETUP_AND_START.md#troubleshooting) for detailed troubleshooting.

## 💰 Cost

**Monthly: ~$8-10**
- RDS YCode: ~$4
- RDS YCampus: ~$4
- Data Transfer: ~$1-2

**Savings: ~70% vs EC2 + Kubernetes**

## 📚 File Structure

```
infra/
├── README_DEPLOYMENT.md          ← You are here
├── START_NOW.md                  ← Copy & paste commands
├── QUICK_START.md                ← 5-minute reference
├── SETUP_AND_START.md            ← Detailed setup guide
├── DEPLOY_DEV_AWS.md             ← Full documentation
├── DEPLOYMENT_OPTIONS.md         ← Alternative options
├── DEPLOY_COMMANDS.md            ← All commands
├── DEPLOYMENT_COMPLETE.md        ← Verification checklist
├── DEPLOYMENT_STATUS.md          ← Current status
├── DEPLOY_DEV_RDS_SINGLE_AZ.md   ← RDS details
├── FIXES_APPLIED.md              ← Technical details
├── START_HERE.md                 ← Original guide
├── READY_TO_DEPLOY.md            ← Previous guide
├── opentofu/                     ← Infrastructure code
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── dev.tfvars
│   └── modules/
├── scripts/
│   └── deploy-dev-aws.sh         ← Automated deployment
└── localstack/                   ← Local AWS simulation
    ├── docker-compose.yml
    └── init-aws.sh
```

## 🎯 Recommended Reading Order

1. **First Time?** → [`START_NOW.md`](START_NOW.md)
2. **Need Details?** → [`SETUP_AND_START.md`](SETUP_AND_START.md)
3. **Want to Understand?** → [`DEPLOY_DEV_AWS.md`](DEPLOY_DEV_AWS.md)
4. **Exploring Options?** → [`DEPLOYMENT_OPTIONS.md`](DEPLOYMENT_OPTIONS.md)
5. **Troubleshooting?** → [`SETUP_AND_START.md#troubleshooting`](SETUP_AND_START.md#troubleshooting)

## 🚀 Ready to Start?

```bash
# One command to start everything
DEPLOY_ENV=dev make install

# Then visit:
# http://localhost:3000 (YCode)
# http://localhost:3002 (YCampus)
```

## 📞 Support

- **Quick Help**: See [`QUICK_START.md`](QUICK_START.md)
- **Detailed Help**: See [`SETUP_AND_START.md`](SETUP_AND_START.md)
- **Commands**: See [`DEPLOY_COMMANDS.md`](DEPLOY_COMMANDS.md)
- **Troubleshooting**: See [`SETUP_AND_START.md#troubleshooting`](SETUP_AND_START.md#troubleshooting)

## ✨ You're All Set!

Your development environment is ready to use. Start building! 🎉

---

**Last Updated**: April 6, 2026
**Status**: ✅ Ready to Deploy
**Cost**: ~$8-10/month
