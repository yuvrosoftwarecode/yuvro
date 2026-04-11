# 🚀 START HERE - Dev Environment Setup

## Two Options

### Option 1: Local Docker Compose Only (Recommended for Quick Testing)

**$0/month** - Everything runs locally

```bash
DEPLOY_ENV=dev make install
```

Access: http://localhost:3000

See: `infra/DEPLOY_DEV_LOCAL_ONLY.md`

---

### Option 2: Docker Compose + AWS RDS (Recommended for Persistent Database)

**~$11-12/month** - Docker Compose locally + RDS in AWS (single AZ)

```bash
# Deploy RDS
cd infra/opentofu
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan

# Get endpoints
tofu output

# Configure .env files with RDS endpoints
# Then start Docker Compose
cd ../..
DEPLOY_ENV=dev make install
```

Access: http://localhost:3000

See: `infra/DEPLOY_DEV_RDS_SINGLE_AZ.md`

---

## Quick Comparison

| Feature | Local Only | Docker + RDS |
|---------|-----------|-------------|
| Cost | $0 | ~$11-12/month |
| Setup Time | 2 min | 10 min |
| Persistence | No | Yes |
| Team Sharing | No | Yes |
| Best For | Quick testing | Development |

---

## What's Running

- YCode Frontend (React)
- YCode Backend (Django)
- YCampus Frontend (React)
- YCampus Backend (Django)
- Code Executor (FastAPI)
- PostgreSQL databases

---

## Common Commands

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Cleanup
DEPLOY_ENV=dev make clean
```

---

## Choose Your Path

**Quick Testing?** → Local Only
```bash
DEPLOY_ENV=dev make install
```

**Persistent Database?** → Docker + RDS
```bash
cd infra/opentofu
tofu apply tfplan
```

---

## Full Documentation

- **Local Only**: `infra/DEPLOY_DEV_LOCAL_ONLY.md`
- **Docker + RDS**: `infra/DEPLOY_DEV_RDS_SINGLE_AZ.md`
- **Recommended**: `infra/DEPLOY_RECOMMENDED.md`

---

## Ready?

Pick an option above and let's go! 🎉
