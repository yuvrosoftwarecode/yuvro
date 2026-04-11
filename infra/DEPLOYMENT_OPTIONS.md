# YCode Dev Environment - Deployment Options

## Overview

Three deployment options for different needs:

1. **Local Docker Compose Only** - $0/month
2. **Docker Compose + RDS (Single AZ)** - ~$11-12/month ✅ **RECOMMENDED**
3. **Docker Compose + RDS (Multi-AZ)** - ~$20-25/month

---

## Option 1: Local Docker Compose Only

### Best For
- Quick testing
- No AWS account needed
- Minimal setup

### Cost
**$0/month**

### Setup Time
**2 minutes**

### Command
```bash
DEPLOY_ENV=dev make install
```

### Pros
✅ Free
✅ Fast setup
✅ No AWS needed
✅ Easy cleanup

### Cons
❌ No persistence
❌ Can't share database
❌ Resets on restart

### Documentation
See: `infra/DEPLOY_DEV_LOCAL_ONLY.md`

---

## Option 2: Docker Compose + RDS (Single AZ) ✅ RECOMMENDED

### Best For
- Development with persistent database
- Team collaboration
- Testing configuration
- Minimal AWS costs

### Cost
**~$11-12/month**

### Setup Time
**10 minutes**

### Commands
```bash
# Deploy RDS
cd infra/opentofu
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan

# Get endpoints
tofu output

# Configure .env files
# Then start Docker Compose
cd ../..
DEPLOY_ENV=dev make install
```

### Configuration
- Region: ap-south-1 (India)
- Single AZ: ap-south-1a
- RDS: db.t3.micro (2GB storage)
- Backups: 0 days (no backups)
- Multi-AZ: false

### Pros
✅ Persistent database
✅ Team shareable
✅ Low cost (~$11-12/month)
✅ Single AZ (no redundancy overhead)
✅ Easy to scale up

### Cons
❌ Requires AWS account
❌ 10 minute setup
❌ No high availability
❌ Single AZ (no disaster recovery)

### Documentation
See: `infra/DEPLOY_DEV_RDS_SINGLE_AZ.md`

---

## Option 3: Docker Compose + RDS (Multi-AZ)

### Best For
- Production-like testing
- High availability testing
- Disaster recovery testing

### Cost
**~$20-25/month**

### Setup Time
**15 minutes**

### Configuration
- Region: ap-south-1 (India)
- Multi-AZ: true (2+ AZs)
- RDS: db.t3.micro (10GB storage)
- Backups: 1 day

### Pros
✅ High availability
✅ Automatic failover
✅ Multi-AZ redundancy
✅ Production-like

### Cons
❌ Higher cost (~$20-25/month)
❌ Longer setup
❌ Overkill for dev testing

### Documentation
See: `infra/DEPLOY_DEV_AWS.md`

---

## Cost Comparison

| Feature | Local | Single AZ | Multi-AZ | EC2+K8s |
|---------|-------|-----------|----------|---------|
| Cost/Month | $0 | ~$11-12 | ~$20-25 | ~$35-40 |
| Setup Time | 2 min | 10 min | 15 min | 20 min |
| Persistence | No | Yes | Yes | Yes |
| Shareable | No | Yes | Yes | Yes |
| HA | No | No | Yes | Yes |
| Best For | Testing | Dev | Staging | Prod |

---

## Recommendation

**Use Option 2: Docker Compose + RDS (Single AZ)**

Why?
- ✅ Persistent database for development
- ✅ Minimal cost (~$11-12/month)
- ✅ Easy to scale up later
- ✅ Perfect for testing configuration
- ✅ Team can share database
- ✅ Single AZ is fine for dev

---

## Quick Start

### Local Only
```bash
DEPLOY_ENV=dev make install
```

### Docker + RDS (Recommended)
```bash
cd infra/opentofu
tofu apply tfplan
tofu output
# Configure .env files
cd ../..
DEPLOY_ENV=dev make install
```

### Multi-AZ
```bash
# Edit infra/opentofu/dev.tfvars
# Change multi_az = true
# Then deploy
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

---

## Switching Between Options

### From Local to Docker + RDS
```bash
# Deploy RDS
cd infra/opentofu
tofu apply tfplan

# Get endpoints
tofu output

# Update .env files
# Restart Docker Compose
DEPLOY_ENV=dev make stop
DEPLOY_ENV=dev make install
```

### From Single AZ to Multi-AZ
```bash
# Edit dev.tfvars
# Change multi_az = true

# Apply changes
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

### From Docker + RDS to Local Only
```bash
# Stop Docker Compose
DEPLOY_ENV=dev make stop

# Destroy RDS
cd infra/opentofu
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy

# Start local only
cd ../..
DEPLOY_ENV=dev make install
```

---

## Documentation

- **Local Only**: `infra/DEPLOY_DEV_LOCAL_ONLY.md`
- **Docker + RDS (Single AZ)**: `infra/DEPLOY_DEV_RDS_SINGLE_AZ.md`
- **Docker + RDS (Multi-AZ)**: `infra/DEPLOY_DEV_AWS.md`
- **Start Here**: `infra/START_HERE.md`
- **Fixes Applied**: `infra/FIXES_APPLIED.md`

---

## Next Steps

1. Choose an option above
2. Follow the documentation
3. Deploy and start developing!

**Recommended**: Option 2 (Docker + RDS Single AZ)

Let's go! 🚀
