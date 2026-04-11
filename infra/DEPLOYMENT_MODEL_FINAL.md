# 🎯 Final Deployment Model

## Overview

The deployment strategy uses `DEPLOY_ENV` to determine the environment and `DEPLOY_TYPE` to determine the deployment method. Default deployment types are set intelligently, but users can override them.

---

## 📋 Deployment Matrix

| DEPLOY_ENV | Default DEPLOY_TYPE | Infrastructure | Config File | Use Case |
|-----------|---------------------|-----------------|-------------|----------|
| **local** | docker | Local Docker Compose | .env.local | Local development |
| **dev** | docker | AWS EC2 with Docker | .env.dev | Dev/Testing (Docker) |
| **dev** | k8s (override) | AWS EC2 with Kubernetes | .env.dev | Dev/Testing (Kubernetes) |
| **staging** | k8s | Kubernetes Cluster | .env.staging | Pre-production |
| **prod** | k8s | Kubernetes Cluster | .env.prod | Production |

---

## 🚀 Quick Commands

### Local Development (Docker Compose)

```bash
# Default: Docker Compose
make install

# Or explicitly
DEPLOY_ENV=local make install

# Stop
make stop

# Logs
make logs

# Clean
make clean
```

**Result:** Services run on localhost (3000, 8001, 3002, 8003, 8002)

---

### Dev Environment - Docker (Default)

```bash
# Deploy to AWS EC2 with Docker (default)
DEPLOY_ENV=dev make install

# Check status
docker compose ps

# View logs
DEPLOY_ENV=dev make logs

# Stop
DEPLOY_ENV=dev make stop

# Clean
DEPLOY_ENV=dev make clean
```

**Result:** Services deployed to AWS EC2 with Docker Compose

---

### Dev Environment - Kubernetes (Optional)

```bash
# Deploy to AWS EC2 with Kubernetes (override default)
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install

# Check status
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make status

# View logs
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make logs

# Port forward
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make port-forward

# Stop
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make stop

# Clean
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make clean
```

**Result:** Services deployed to AWS EC2 with Kubernetes

---

### Staging Environment (Kubernetes)

```bash
# Deploy to staging (Kubernetes only)
DEPLOY_ENV=staging make install

# Check status
DEPLOY_ENV=staging make status

# View logs
DEPLOY_ENV=staging make logs

# Stop
DEPLOY_ENV=staging make stop
```

**Result:** Services deployed to staging Kubernetes cluster

---

### Production Environment (Kubernetes)

```bash
# Deploy to production (Kubernetes only)
DEPLOY_ENV=prod make install

# Check status
DEPLOY_ENV=prod make status

# View logs
DEPLOY_ENV=prod make logs

# Stop
DEPLOY_ENV=prod make stop
```

**Result:** Services deployed to production Kubernetes cluster

---

## 🔄 DEPLOY_TYPE Auto-Selection Logic

```makefile
DEPLOY_TYPE ?= $(if $(filter staging prod,$(DEPLOY_ENV)),k8s,docker)
```

This means:
- If `DEPLOY_ENV=staging` or `DEPLOY_ENV=prod` → `DEPLOY_TYPE=k8s` (forced)
- Otherwise → `DEPLOY_TYPE=docker` (default)

**User can override:**
```bash
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install  # Override default docker with k8s
```

---

## ✅ Validation Rules

The Makefile validates:

1. **DEPLOY_ENV is valid**: local, dev, staging, prod
2. **DEPLOY_TYPE is valid**: docker, k8s
3. **Compatibility**:
   - `staging` or `prod` with `docker` → ERROR
   - All other combinations are allowed

**Valid Combinations:**
```bash
✅ make install                              # local + docker
✅ DEPLOY_ENV=local make install             # local + docker
✅ DEPLOY_ENV=dev make install               # dev + docker (default)
✅ DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install  # dev + k8s (override)
✅ DEPLOY_ENV=staging make install           # staging + k8s
✅ DEPLOY_ENV=prod make install              # prod + k8s
```

**Invalid Combinations:**
```bash
❌ DEPLOY_ENV=staging DEPLOY_TYPE=docker make install  # staging requires k8s
❌ DEPLOY_ENV=prod DEPLOY_TYPE=docker make install     # prod requires k8s
```

---

## 📊 Environment Files

Each environment uses specific `.env` files:

### Local Development
```
ycode-backend-api/.env.local
ycampus-backend-api/.env.local
ycode-web/.env.local
ycampus-web/.env.local
yuvro-code-executer/.env.local
```

### Dev Environment
```
ycode-backend-api/.env.dev
ycampus-backend-api/.env.dev
ycode-web/.env.dev
ycampus-web/.env.dev
yuvro-code-executer/.env.dev
```

### Staging Environment
```
ycode-backend-api/.env.staging
ycampus-backend-api/.env.staging
ycode-web/.env.staging
ycampus-web/.env.staging
yuvro-code-executer/.env.staging
```

### Production Environment
```
ycode-backend-api/.env.prod
ycampus-backend-api/.env.prod
ycode-web/.env.prod
ycampus-web/.env.prod
yuvro-code-executer/.env.prod
```

---

## 🏗️ Infrastructure Setup

### Local Development
- **Database**: Local PostgreSQL or RDS (configured in .env.local)
- **Deployment**: Docker Compose on local machine
- **Access**: http://localhost:3000, http://localhost:8001, etc.
- **Cost**: Free (local) or ~$8-10/month (RDS)

### Dev Environment (Docker)
- **Database**: RDS (configured in .env.dev)
- **Deployment**: Docker Compose on AWS EC2 instance
- **Access**: Via SSH or AWS load balancer
- **Cost**: ~$15-25/month (EC2 + RDS)
- **Configuration**: `docker-compose.dev.yml`

### Dev Environment (Kubernetes)
- **Database**: RDS (configured in .env.dev)
- **Deployment**: Kubernetes on AWS EC2 instances
- **Access**: Via port-forward or AWS load balancer
- **Cost**: ~$20-50/month (EC2 + RDS)
- **Configuration**: `helm/values-dev.yaml`

### Staging Environment
- **Database**: RDS with backups
- **Deployment**: Kubernetes cluster
- **Access**: Via AWS load balancer or ingress
- **Cost**: ~$50-100/month
- **Configuration**: `helm/values-staging.yaml`

### Production Environment
- **Database**: RDS with encryption and backups
- **Deployment**: Kubernetes cluster with auto-scaling
- **Access**: Via AWS load balancer with SSL/TLS
- **Cost**: ~$100-200+/month
- **Configuration**: `helm/values-prod.yaml`

---

## 🔄 Deployment Flow

### Local Development Flow
```
make install
    ↓
DEPLOY_ENV=local (default)
DEPLOY_TYPE=docker (auto-selected)
    ↓
Load .env.local files
    ↓
Docker Compose up (docker-compose.local.yml)
    ↓
Services running on localhost
```

### Dev Environment (Docker) Flow
```
DEPLOY_ENV=dev make install
    ↓
DEPLOY_ENV=dev
DEPLOY_TYPE=docker (auto-selected)
    ↓
Load .env.dev files
    ↓
Docker Compose up (docker-compose.dev.yml)
    ↓
Services deployed to AWS EC2 with Docker
```

### Dev Environment (Kubernetes) Flow
```
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
    ↓
DEPLOY_ENV=dev
DEPLOY_TYPE=k8s (user override)
    ↓
Load .env.dev files
    ↓
kubectl apply + helm upgrade
    ↓
Services deployed to AWS EC2 Kubernetes
```

### Staging/Production Flow
```
DEPLOY_ENV=staging make install
    ↓
DEPLOY_ENV=staging
DEPLOY_TYPE=k8s (auto-selected, forced)
    ↓
Load .env.staging files
    ↓
kubectl apply + helm upgrade
    ↓
Services deployed to Kubernetes cluster
```

---

## 📝 Makefile Logic

### DEPLOY_TYPE Auto-Selection

```makefile
DEPLOY_TYPE ?= $(if $(filter staging prod,$(DEPLOY_ENV)),k8s,docker)
```

**Behavior:**
- `staging` or `prod` → Always `k8s`
- Everything else → Default `docker`
- User can override with `DEPLOY_TYPE=k8s`

### Validation Rules

```makefile
# Only staging and prod require k8s
if (staging|prod) && docker → ERROR
```

### Docker Compose Configuration

```makefile
ENV_OVERRIDE := $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml)
COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml $(ENV_OVERRIDE)
```

**Behavior:**
- `dev` → Uses `docker-compose.dev.yml`
- Everything else → Uses `docker-compose.local.yml`

---

## 🎯 Common Workflows

### Workflow 1: Local Development

```bash
# Start
make install

# Access
# http://localhost:3000 (YCode)
# http://localhost:3002 (YCampus)

# Logs
make logs

# Stop
make stop
```

---

### Workflow 2: Deploy to AWS EC2 (Docker)

```bash
# Deploy
DEPLOY_ENV=dev make install

# Check status
docker compose ps

# View logs
DEPLOY_ENV=dev make logs

# Stop
DEPLOY_ENV=dev make stop
```

---

### Workflow 3: Deploy to AWS EC2 (Kubernetes)

```bash
# Deploy
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install

# Check status
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make status

# Port forward
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make port-forward

# Access via port-forward
# http://localhost:3000

# Logs
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make logs

# Stop
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make stop
```

---

### Workflow 4: Deploy to Staging

```bash
# Deploy
DEPLOY_ENV=staging make install

# Check status
DEPLOY_ENV=staging make status

# Access via load balancer
# https://staging.ycode.example.com

# Logs
DEPLOY_ENV=staging make logs

# Stop
DEPLOY_ENV=staging make stop
```

---

### Workflow 5: Deploy to Production

```bash
# Deploy
DEPLOY_ENV=prod make install

# Check status
DEPLOY_ENV=prod make status

# Access via load balancer
# https://ycode.example.com

# Logs
DEPLOY_ENV=prod make logs

# Monitor
DEPLOY_ENV=prod make status
```

---

## 🔐 Environment-Specific Configuration

### Local (.env.local)
- Debug mode enabled
- Local database or RDS
- CORS allows localhost
- No SSL/TLS required

### Dev (.env.dev)
- Debug mode enabled
- RDS database
- CORS allows EC2 instances
- Self-signed SSL/TLS (optional)

### Staging (.env.staging)
- Debug mode disabled
- RDS with backups
- CORS restricted
- SSL/TLS required

### Production (.env.prod)
- Debug mode disabled
- RDS with encryption and backups
- CORS restricted to domain
- SSL/TLS required
- Security headers enabled

---

## 📚 Related Documentation

- `DEPLOYMENT_STRATEGY.md` - Detailed deployment strategy
- `DEPLOYMENT_CHANGES.md` - What changed and migration guide
- `SETUP_AND_START.md` - Local development setup
- `DEPLOY_DEV_AWS.md` - AWS EC2 deployment details
- `DEPLOYMENT_OPTIONS.md` - Deployment alternatives
- `DEPLOY_COMMANDS.md` - All available commands

---

## 🎉 Summary

| Scenario | Command | Result |
|----------|---------|--------|
| Local development | `make install` | Docker Compose on localhost |
| Dev with Docker | `DEPLOY_ENV=dev make install` | Docker Compose on AWS EC2 |
| Dev with Kubernetes | `DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install` | Kubernetes on AWS EC2 |
| Staging | `DEPLOY_ENV=staging make install` | Kubernetes on staging cluster |
| Production | `DEPLOY_ENV=prod make install` | Kubernetes on production cluster |

**Key Points:**
- ✅ Default deployment types are intelligent
- ✅ Users can override defaults when needed
- ✅ Staging and production always use Kubernetes
- ✅ Local and dev default to Docker but can use Kubernetes
- ✅ Clear validation prevents invalid combinations
- ✅ Backward compatible with existing workflows

---

## ✨ You're Ready!

The deployment model is now flexible and powerful:

```bash
# Local development
make install

# AWS EC2 with Docker (default)
DEPLOY_ENV=dev make install

# AWS EC2 with Kubernetes (optional)
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install

# Staging
DEPLOY_ENV=staging make install

# Production
DEPLOY_ENV=prod make install
```

Happy deploying! 🚀
