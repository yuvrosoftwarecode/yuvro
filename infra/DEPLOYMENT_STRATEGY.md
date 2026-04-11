# 🎯 Deployment Strategy - DEPLOY_ENV Mapping

## Overview

The deployment strategy has been updated to use `DEPLOY_ENV` to determine both the environment AND the deployment type:

| DEPLOY_ENV | Deployment Type | Infrastructure | Use Case |
|-----------|-----------------|-----------------|----------|
| **local** | Docker Compose | Local machine | Development |
| **dev** | Kubernetes (AWS EC2) | AWS EC2 instances | Development/Testing |
| **staging** | Kubernetes | Kubernetes cluster | Pre-production |
| **prod** | Kubernetes | Kubernetes cluster | Production |

---

## 🚀 Deployment Commands

### Local Development (Docker Compose)

```bash
# Start all services locally
make install

# Or explicitly
DEPLOY_ENV=local make install

# Start specific platform
make install-ycode
make install-ycampus

# Stop services
make stop

# View logs
make logs

# Clean up
make clean
```

**What happens:**
- Uses local Docker Compose
- Connects to local databases or RDS (based on .env.local)
- Services run on localhost:3000, 8001, 3002, 8003, 8002
- Perfect for development

---

### Dev Environment (AWS EC2 with Kubernetes)

```bash
# Deploy to AWS EC2 with Kubernetes
DEPLOY_ENV=dev make install

# Check deployment status
DEPLOY_ENV=dev make status

# View logs
DEPLOY_ENV=dev make logs

# Setup port forwarding
DEPLOY_ENV=dev make port-forward

# Stop deployment
DEPLOY_ENV=dev make stop

# Clean up
DEPLOY_ENV=dev make clean
```

**What happens:**
- Deploys to AWS EC2 instances using Kubernetes
- Uses Helm charts from `helm/` directory
- Uses `helm/values-dev.yaml` configuration
- Services run on EC2 instances (accessible via port-forward)
- Perfect for testing in AWS environment

---

### Staging Environment (Kubernetes)

```bash
# Deploy to staging Kubernetes cluster
DEPLOY_ENV=staging make install

# Check deployment status
DEPLOY_ENV=staging make status

# View logs
DEPLOY_ENV=staging make logs

# Stop deployment
DEPLOY_ENV=staging make stop
```

---

### Production Environment (Kubernetes)

```bash
# Deploy to production Kubernetes cluster
DEPLOY_ENV=prod make install

# Check deployment status
DEPLOY_ENV=prod make status

# View logs
DEPLOY_ENV=prod make logs

# Stop deployment
DEPLOY_ENV=prod make stop
```

---

## 📋 Environment Files

Each environment uses specific `.env` files:

### Local Development
```
ycode-backend-api/.env.local
ycampus-backend-api/.env.local
ycode-web/.env.local
ycampus-web/.env.local
yuvro-code-executer/.env.local
```

### Dev Environment (AWS EC2)
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

### Dev Environment (AWS EC2)
- **Database**: RDS (configured in .env.dev)
- **Deployment**: Kubernetes on AWS EC2 instances
- **Access**: Via port-forward or AWS load balancer
- **Cost**: ~$20-50/month (EC2 + RDS)
- **Configuration**: `helm/values-dev.yaml`

### Staging Environment
- **Database**: RDS or managed database
- **Deployment**: Kubernetes cluster
- **Access**: Via AWS load balancer or ingress
- **Cost**: ~$50-100/month
- **Configuration**: `helm/values-staging.yaml`

### Production Environment
- **Database**: RDS with backups and encryption
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
_validate-deploy (checks DEPLOY_ENV=local, DEPLOY_TYPE=docker)
    ↓
Load .env.local files
    ↓
Docker Compose up (docker-compose.local.yml)
    ↓
Services running on localhost
```

### Dev Environment Flow
```
DEPLOY_ENV=dev make install
    ↓
_validate-deploy (checks DEPLOY_ENV=dev, DEPLOY_TYPE=k8s)
    ↓
Load .env.dev files
    ↓
kubectl apply -f helm/namespace.yaml
    ↓
helm upgrade --install with helm/values-dev.yaml
    ↓
Services deployed to AWS EC2 Kubernetes cluster
```

---

## 📊 Makefile Logic

### DEPLOY_TYPE Auto-Selection

```makefile
DEPLOY_TYPE ?= $(if $(filter local,$(DEPLOY_ENV)),docker,k8s)
```

This means:
- If `DEPLOY_ENV=local` → `DEPLOY_TYPE=docker`
- If `DEPLOY_ENV=dev|staging|prod` → `DEPLOY_TYPE=k8s`

### Validation Rules

```makefile
# local must use docker
if DEPLOY_ENV=local && DEPLOY_TYPE!=docker → ERROR

# dev, staging, prod must use k8s
if DEPLOY_ENV=dev|staging|prod && DEPLOY_TYPE!=k8s → ERROR
```

---

## 🎯 Common Workflows

### Workflow 1: Local Development

```bash
# 1. Start local services
make install

# 2. Access applications
# http://localhost:3000 (YCode)
# http://localhost:3002 (YCampus)

# 3. View logs
make logs

# 4. Run migrations
make makemigrations

# 5. Load test data
make load-fixtures-ycode

# 6. Stop when done
make stop
```

### Workflow 2: Deploy to Dev (AWS EC2)

```bash
# 1. Deploy to AWS EC2
DEPLOY_ENV=dev make install

# 2. Check status
DEPLOY_ENV=dev make status

# 3. Setup port forwarding
DEPLOY_ENV=dev make port-forward

# 4. Access applications
# http://localhost:3000 (via port-forward)
# http://localhost:8001 (via port-forward)

# 5. View logs
DEPLOY_ENV=dev make logs

# 6. Stop when done
DEPLOY_ENV=dev make stop
```

### Workflow 3: Deploy to Staging

```bash
# 1. Deploy to staging
DEPLOY_ENV=staging make install

# 2. Check status
DEPLOY_ENV=staging make status

# 3. View logs
DEPLOY_ENV=staging make logs

# 4. Access via load balancer
# https://staging.ycode.example.com

# 5. Stop when done
DEPLOY_ENV=staging make stop
```

### Workflow 4: Deploy to Production

```bash
# 1. Deploy to production
DEPLOY_ENV=prod make install

# 2. Check status
DEPLOY_ENV=prod make status

# 3. View logs
DEPLOY_ENV=prod make logs

# 4. Access via load balancer
# https://ycode.example.com

# 5. Monitor
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

## 📝 Helm Configuration

Each environment has a corresponding Helm values file:

### helm/values-local.yaml
- Not used (Docker Compose instead)

### helm/values-dev.yaml
- AWS EC2 configuration
- Development settings
- Minimal resources

### helm/values-staging.yaml
- Staging configuration
- Pre-production settings
- Medium resources

### helm/values-prod.yaml
- Production configuration
- High availability
- Maximum resources

---

## 🚀 Quick Reference

```bash
# Local Development
make install                    # Start locally
make stop                       # Stop locally
make logs                       # View logs

# Dev Environment (AWS EC2)
DEPLOY_ENV=dev make install     # Deploy to AWS
DEPLOY_ENV=dev make status      # Check status
DEPLOY_ENV=dev make logs        # View logs
DEPLOY_ENV=dev make stop        # Stop deployment

# Staging Environment
DEPLOY_ENV=staging make install # Deploy to staging
DEPLOY_ENV=staging make status  # Check status

# Production Environment
DEPLOY_ENV=prod make install    # Deploy to production
DEPLOY_ENV=prod make status     # Check status
```

---

## ✅ Validation

The Makefile automatically validates:

1. **DEPLOY_ENV is valid**: local, dev, staging, or prod
2. **DEPLOY_TYPE is valid**: docker or k8s
3. **DEPLOY_ENV and DEPLOY_TYPE are compatible**:
   - local → docker only
   - dev, staging, prod → k8s only

If validation fails, you'll see an error message:
```
❌ Invalid DEPLOY_ENV='invalid'. Must be one of: local dev staging prod
❌ Incompatible: DEPLOY_ENV=local requires DEPLOY_TYPE=docker
```

---

## 📚 Related Documentation

- `SETUP_AND_START.md` - Local development setup
- `DEPLOY_DEV_AWS.md` - AWS EC2 deployment
- `DEPLOYMENT_OPTIONS.md` - Deployment alternatives
- `DEPLOY_COMMANDS.md` - All available commands
- `README_DEPLOYMENT.md` - Documentation index

---

## 🎉 Summary

The new deployment strategy simplifies environment management:

- **`make install`** → Local development (Docker Compose)
- **`DEPLOY_ENV=dev make install`** → AWS EC2 (Kubernetes)
- **`DEPLOY_ENV=staging make install`** → Staging (Kubernetes)
- **`DEPLOY_ENV=prod make install`** → Production (Kubernetes)

Each environment automatically uses the correct deployment type, configuration files, and infrastructure setup.
