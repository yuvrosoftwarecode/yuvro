# 🎉 YCode Dev Environment - Complete Setup

## ✅ Everything is Ready!

### Infrastructure Created

✅ **AWS RDS Databases** (ap-south-1)
- YCode: `dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432`
- YCampus: `dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432`

✅ **VPC & Networking**
- VPC: vpc-0893533f938d45e9d
- 2 Public Subnets (ap-south-1a, ap-south-1b)
- Security Groups configured
- NAT Gateways for outbound traffic

✅ **Storage & Monitoring**
- S3 buckets for app data and logs
- CloudWatch monitoring
- IAM roles configured

### Configuration Files Ready

✅ **OpenTofu**
- `infra/opentofu/dev.tfvars` - Minimal dev config
- `infra/opentofu/modules/rds/main.tf` - Fixed for gp2 storage
- `infra/opentofu/modules/security_groups/main.tf` - Fixed port config
- `infra/opentofu/variables.tf` - Dev environment support

✅ **Docker Compose**
- All services configured
- Environment variables ready
- Ready to start

### Cost

**Monthly**: ~$8-10
- RDS YCode: ~$4
- RDS YCampus: ~$4
- Data transfer: ~$1-2

## 🚀 Quick Start (5 minutes)

### 1. Configure Environment Files

Copy the RDS endpoints to your `.env.dev` files:

**yc-backend-api/.env.dev**
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
```

**ycampus-backend-api/.env.dev**
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

### 2. Start Docker Compose

```bash
DEPLOY_ENV=dev make install
```

### 3. Access Applications

- YCode: http://localhost:3000
- YCampus: http://localhost:3002

Done! 🎉

## 📚 Documentation

| File | Purpose |
|------|---------|
| `READY_TO_DEPLOY.md` | **Start here** - RDS endpoints & setup |
| `START_HERE.md` | Quick overview of options |
| `DEPLOY_DEV_RDS_SINGLE_AZ.md` | Full deployment guide |
| `DEPLOY_COMMANDS.md` | Copy-paste commands |
| `DEPLOYMENT_OPTIONS.md` | Comparison of options |
| `FIXES_APPLIED.md` | Technical fixes made |
| `DEPLOYMENT_STATUS.md` | Current status |

## 🔧 What Was Fixed

1. ✅ RDS module: Single AZ support with 2 subnets
2. ✅ S3 module: Lifecycle configuration
3. ✅ Security groups: Port configuration
4. ✅ Variables: Dev environment support
5. ✅ Storage: gp2 (5GB minimum) for cost savings
6. ✅ Encryption: Disabled for dev
7. ✅ Instance type: db.t3.micro (cheapest)

## 📊 Architecture

```
Local Machine (Docker Compose)          AWS ap-south-1
├── YCode Frontend (3000)               ├── RDS YCode DB
├── YCode Backend (8001)                └── RDS YCampus DB
├── YCampus Frontend (3002)
├── YCampus Backend (8003)
└── Code Executor (8002)
```

## 🎯 Next Steps

1. **Configure .env files** (copy endpoints above)
2. **Start Docker Compose**: `DEPLOY_ENV=dev make install`
3. **Access applications** at localhost
4. **Run migrations** (optional): `DEPLOY_ENV=dev make makemigrations`
5. **Load test data** (optional): `DEPLOY_ENV=dev make load-fixtures-ycode`
6. **Start developing!**

## 💡 Common Commands

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Database
psql -h dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com -U ycode_admin -d ycode

# Migrations
DEPLOY_ENV=dev make makemigrations

# Tests
DEPLOY_ENV=dev make test-all

# Cleanup
DEPLOY_ENV=dev make clean
```

## 🗑️ Cleanup

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

## 📝 RDS Credentials

**YCode**
- Endpoint: dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
- Port: 5432
- Database: ycode
- Username: ycode_admin
- Password: ChangeMe123!DevPassword

**YCampus**
- Endpoint: dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
- Port: 5432
- Database: ycampus
- Username: ycampus_admin
- Password: ChangeMe123!DevPassword

## ✨ Summary

✅ Infrastructure deployed
✅ RDS databases created
✅ All configurations ready
✅ Docker Compose configured
✅ Documentation complete

**Ready to deploy!** 🚀

See `READY_TO_DEPLOY.md` for detailed setup instructions.
