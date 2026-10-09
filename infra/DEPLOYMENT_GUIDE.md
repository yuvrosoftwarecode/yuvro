# Deployment Guide: Local K8s, Local Docker, Dev, and Production

This guide covers deployment procedures, URLs, ports, and commands for all Yuvro environments.

---

## Overview

| Environment | Infrastructure | Location | Status | Dashboard | Best For |
|---|---|---|---|---|---|
| **Local K8s** | Kubernetes (Docker Desktop) | Your Machine | Development | kubectl | Production-like testing |
| **Local Docker** | Docker Compose | Your Machine | Development | docker ps | Fast development |
| **Dev** | EC2 + Docker Compose | AWS | Team Testing | SSH | Team collaboration |
| **Prod** | EKS (Kubernetes) | AWS | Live | kubectl + ALB | Production |

---

## Local Kubernetes Environment

### Summary

- **Where:** Docker Desktop Kubernetes (local machine)
- **Type:** Single-node K8s cluster
- **Apps:** All 6 apps (ycode, ycampus, ylabs, yhub, ymarketplace, code-executor)
- **Databases:** In-cluster PostgreSQL per app
- **Storage:** In-cluster volumes
- **Build:** Docker images built locally with `Never` pull policy

### URLs and Ports

#### NodePort Access (http://localhost:PORT)

| Application | Service | Frontend | Backend | Database | Notes |
|---|---|---|---|---|---|
| **YCode** | 30000-30999 | http://localhost:30000 | http://localhost:30008 | localhost:5432 | Main platform |
| **YCampus** | 30000-30999 | http://localhost:30001 | http://localhost:30009 | localhost:5432 | Campus management |
| **YLabs** | 30000-30999 | http://localhost:30002 | http://localhost:30010 | localhost:5432 | Labs platform |
| **YHub** | 30000-30999 | N/A | http://localhost:30011 | localhost:5432 | Backend only |
| **YMarketplace** | 30000-30999 | http://localhost:30004 | http://localhost:30012 | localhost:5432 | Marketplace |
| **Code Executor** | 30000-30999 | N/A | http://localhost:30013 | N/A | Execution service |

### Deploy Commands

#### Deploy All Applications
```bash
# Deploy all 6 apps to local K8s
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy

# Expected output: 15/15 pods Ready (1/1)
```

#### Deploy Single Application
```bash
# YCode only
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy-ycode

# YCampus only
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy-ycampus

# YLabs only
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy-ylabs

# YHub only (no frontend)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy-yhub

# YMarketplace only
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy-ymarketplace

# Code Executor only
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy-code-executor
```

### Configuration

**values.yaml** (local defaults):
```yaml
image:
  pullPolicy: Never          # Use local Docker images only
  
env:
  DEPLOY_ENV: "local"
  DEBUG: "True"
  VITE_API_URL: "http://localhost:8000"
  
components:
  backend:
    replicas: 1
  frontend:
    replicas: 1
  database:
    enabled: true            # In-cluster PostgreSQL
    
service:
  type: NodePort             # Direct localhost access
```

### Health Checks

```bash
# Check all pods
kubectl get pods -n yuvro-ns

# Check specific app
kubectl get pods -n yuvro-ns -l app=ycode

# View pod logs
kubectl logs -n yuvro-ns deployment/ycode-backend -f

# Test backend health
curl http://localhost:30008/api/health/
```

### Troubleshooting

| Issue | Solution |
|---|---|
| Pod CrashLoopBackOff | Check logs: `kubectl logs -n yuvro-ns {pod-name}` |
| ErrImageNeverPull | Build image: `docker build -t yuvro-ycode-backend:latest ycode-backend-api/` |
| Database connection timeout | Verify DB pod: `kubectl get pods -n yuvro-ns -l app=ycode-db` |

---

## Local Docker Compose Environment

### Summary

- **Where:** Local machine using Docker Compose (development mode)
- **Type:** Docker Compose orchestration with live code reload
- **Apps:** All 6 apps (ycode, ycampus, ylabs, yhub, ymarketplace, code-executor)
- **Databases:** Docker containers with volumes
- **Storage:** MinIO (S3-compatible local storage)
- **Build:** Docker images built locally with BUILDKIT
- **Source Code:** Mounted volumes with live reload

### URLs and Ports

#### Docker Compose Access (http://localhost:PORT)

| Application | Frontend | Backend | Database | Notes |
|---|---|---|---|---|
| **YCode** | http://localhost:3000 | http://localhost:8000 | localhost:5432 | Hot reload enabled |
| **YCampus** | http://localhost:3001 | http://localhost:8001 | localhost:5433 | Hot reload enabled |
| **YLabs** | http://localhost:3002 | http://localhost:8002 | - | Hot reload enabled |
| **YHub** | N/A | http://localhost:8011 | localhost:5436 | Backend only |
| **YMarketplace** | http://localhost:3004 | http://localhost:8004 | - | Hot reload enabled |
| **Code Executor** | N/A | http://localhost:8009 | N/A | Execution service |
| **MinIO** | http://localhost:9100 | http://localhost:9000 | N/A | S3-compatible storage |

### Deploy Commands

#### Deploy All Applications (Docker Compose)
```bash
# Deploy all 6 apps + code executor using Docker Compose with live reload
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy

# Expected output: All services up and healthy with logs streaming
```

#### Deploy Single Application (Docker Compose)
```bash
# YCode only (with hot reload)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy-ycode

# YCampus only (with hot reload)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy-ycampus

# YLabs only (with hot reload)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy-ylabs

# YHub only (no frontend)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy-yhub

# YMarketplace only (with hot reload)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy-ymarketplace

# Code Executor only
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy-code-executor
```

#### Stop Services
```bash
# Stop all services (keeps volumes and data)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker make stop

# Stop specific app
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker make stop-ycode

# Destroy services (removes volumes and data)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker make destroy-ycode
```

### Docker Compose Files

The deployment uses multiple docker-compose files that are composed together:

```bash
# Base configuration
docker-compose.yuvro.yml              # Common services (minio, networks)
docker-compose.ycode.yml              # YCode services
docker-compose.ycampus.yml            # YCampus services
docker-compose.ylabs.yml              # YLabs services
docker-compose.yhub.yml               # YHub services
docker-compose.ymarketplace.yml       # YMarketplace services
docker-compose.code-executor.yml      # Code Executor

# Environment overlay
docker-compose.local.yml              # Local overrides (volume mounts, .env files)
docker-compose.dev.yml                # Dev overrides (for EC2)
```

### Configuration

**docker-compose.local.yml** (local overrides):
```yaml
services:
  ycode-backend:
    volumes:
      - ./ycode-backend-api:/app          # Mount source code for live reload
      - /app/venv                          # Keep venv inside container
    env_file:
      - ./ycode-backend-api/.env.local    # Local environment variables
      - ./ycode-backend-api/.env.local-secrets  # Local secrets (optional)
      
  ycode-frontend:
    volumes:
      - ./ycode-web:/app                   # Mount source code for hot reload
      - /app/node_modules                  # Keep node_modules inside container
    env_file:
      - ./ycode-web/.env.local            # Local environment variables
```

**Environment Files:**
```
ycode-backend-api/.env.local              # Local backend config
ycode-backend-api/.env.local-secrets       # Local backend secrets (not in git)
ycode-web/.env.local                       # Local frontend config
ycode-web/.env.local-secrets               # Local frontend secrets (not in git)
```

### Health Checks

```bash
# Check running containers
docker ps

# Check container status for specific app
docker ps | grep ycode

# View container logs
docker logs -f ycode-backend
docker logs -f ycode-frontend

# Test backend health endpoint
curl http://localhost:8000/api/health/
curl http://localhost:8001/api/health/

# Test frontend
curl http://localhost:3000/
curl http://localhost:3001/
```

### Database Access

```bash
# Connect to YCode database
psql -h localhost -U postgres -d ycode_backend_db

# Via Docker container
docker exec -it ycode-db psql -U postgres -d ycode_backend_db
```

### Live Reload & Development

#### Frontend Hot Reload
Frontend changes are detected automatically by Vite:
```bash
# Edit ycode-web/src/App.tsx
# The browser auto-reloads within 1-2 seconds
```

#### Backend Auto-Reload
Backend changes are detected by Django development server:
```bash
# Edit ycode-backend-api/some_app/views.py
# The server automatically reloads within 1-2 seconds
```

### Viewing Logs

```bash
# Stream all logs
docker-compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.local.yml logs -f

# Stream logs for specific service
docker logs -f ycode-backend
docker logs -f ycode-frontend

# View last N lines
docker logs --tail=100 ycode-backend
```

### Troubleshooting

| Issue | Solution |
|---|---|
| Port already in use | Kill process: `lsof -i :3000` then `kill -9 PID` |
| Container fails to start | Check logs: `docker logs container-name` |
| Database connection error | Ensure DB container is running: `docker ps \| grep db` |
| Out of disk space | Prune Docker: `docker system prune -a --volumes` |
| Hot reload not working | Restart container: `docker restart ycode-backend` |
| Network issues | Verify networks: `docker network ls \| grep yuvro` |

---

## Development Environment (EC2 + Docker Compose)

### Summary

- **Where:** AWS EC2 instance
- **Type:** Docker Compose orchestration
- **Apps:** Deployed via Docker Compose
- **Databases:** Docker containers with mounted volumes
- **Storage:** S3 (MinIO) or AWS S3
- **Build:** Images built on EC2 or pulled from registry

### URLs and Ports

#### EC2 Access (http://EC2_IP:PORT)

| Application | Frontend | Backend | Database | SSH |
|---|---|---|---|---|
| **YCode** | :3000 | :8000 | :5432 | Port 22 |
| **YCampus** | :3001 | :8001 | :5433 | (same) |
| **YLabs** | :3002 | :8002 | - | (same) |
| **YMarketplace** | :3004 | :8004 | - | (same) |
| **Code Executor** | N/A | :8009 | N/A | (same) |

**Example URLs** (replace `EC2_IP` with actual IP):
```
http://ec2-xx-xxx-xxx-xxx.ap-south-1.compute.amazonaws.com:3000   # YCode frontend
http://ec2-xx-xxx-xxx-xxx.ap-south-1.compute.amazonaws.com:8000   # YCode backend
https://ycode-dev.yuvro.ai                                          # DNS (if configured)
```

### Deploy Commands

#### Initial Setup
```bash
# SSH into EC2
ssh -i /path/to/key.pem ec2-user@EC2_IP

# Clone repository
git clone https://github.com/yuvro/yuvro-code.git
cd yuvro-code

# Checkout dev branch
git checkout main
```

#### Deploy via Docker Compose
```bash
# Build all images
docker-compose -f docker-compose.dev.yml build

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

#### Deploy via GitHub Actions (CI/CD)
```bash
# Automatically triggered on commit to main
# Workflow: .github/workflows/dev_deploy_ec2.yml

# Manual trigger via GitHub:
# 1. Go to Actions tab
# 2. Select "Deploy Dev (EC2)"
# 3. Click "Run workflow"
```

### Configuration

**docker-compose.dev.yml** variables:
```yaml
services:
  ycode-backend:
    build:
      context: ./ycode-backend-api
      target: development          # Development stage
    ports:
      - "8000:8000"
    environment:
      - DEPLOY_ENV=dev
      - DEBUG=True
```

**Environment Files:**
```
ycode-backend-api/.env.dev              # Dev environment
ycode-backend-api/.env.dev-secrets       # Dev secrets
```

### Health Checks

```bash
# Check running containers
docker ps

# Check container logs
docker logs ycode-backend

# Test endpoints from EC2
curl http://localhost:8000/api/health/
```

### Troubleshooting

| Issue | Solution |
|---|---|
| Port already in use | Stop containers: `docker-compose down` |
| Container fails to start | Check logs: `docker logs container-name` |
| Database connection error | Verify DB: `docker ps \| grep db` |
| Out of disk space | Prune Docker: `docker system prune -a` |

---

## Production Environment (AWS EKS)

### Summary

- **Where:** AWS Elastic Kubernetes Service (EKS)
- **Type:** Managed Kubernetes cluster
- **Apps:** All 6 apps deployed via Helm
- **Databases:** AWS RDS PostgreSQL (managed)
- **Storage:** AWS S3
- **Images:** GitHub Container Registry (GHCR)
- **Load Balancing:** AWS ALB/NLB via LoadBalancer service

### URLs and Ports

#### DNS and URLs

| Application | URL | Type | Service | Notes |
|---|---|---|---|---|
| **YCode** | https://ycode.yuvro.ai | HTTPS | ALB | Main platform |
| **YCode API** | https://api.ycode.yuvro.ai | HTTPS | ALB | Backend API |
| **YCampus** | https://ycampus.yuvro.ai | HTTPS | ALB | Campus mgmt |
| **YCampus API** | https://api.ycampus.yuvro.ai | HTTPS | ALB | Backend API |
| **YLabs** | https://ylabs.yuvro.ai | HTTPS | ALB | Labs platform |
| **YHub API** | https://api.yhub.yuvro.ai | HTTPS | ALB | Backend only |
| **YMarketplace** | https://ymarketplace.yuvro.ai | HTTPS | ALB | Marketplace |
| **Code Executor** | N/A | Internal | K8s DNS | Internal service |

### Deploy Commands

#### Prerequisites
```bash
# Install tools
brew install kubectl helm aws-cli

# Configure AWS credentials
aws configure
export AWS_REGION=ap-south-1

# Login to EKS cluster
aws eks update-kubeconfig --name yuvro-prod-eks --region ap-south-1

# Verify cluster access
kubectl cluster-info
```

#### Deploy Single Application (Helm)
```bash
# Deploy YCode to production
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy-ycode

# Deploy YCampus
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy-ycampus

# Deploy YLabs
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy-ylabs

# Deploy Code Executor
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy-code-executor
```

#### Deploy All Applications (Helm)
```bash
# Deploy all apps to production
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy

# Monitor deployment progress
kubectl get pods -n yuvro-ns --watch

# Check Helm releases
helm list -n yuvro-ns
```

### Configuration

**values-prod.yaml** (production overrides):
```yaml
image:
  pullPolicy: IfNotPresent      # Pull from GHCR
  
env:
  DEPLOY_ENV: "prod"
  DEBUG: "False"
  VITE_API_URL: "https://api.ycode.yuvro.ai"
  DATABASE_URL: "postgresql://...@ycode-rds.ap-south-1.rds.amazonaws.com:5432/ycode_backend_db"
  
components:
  backend:
    replicas: 3                 # High availability
  frontend:
    replicas: 2
  database:
    enabled: false              # Use RDS instead
    
service:
  type: LoadBalancer            # AWS ALB/NLB
```

### Health Checks

```bash
# Check pod status
kubectl get pods -n yuvro-ns

# View pod logs
kubectl logs -n yuvro-ns deployment/ycode-backend -f

# Check services
kubectl get svc -n yuvro-ns

# Test backend health
kubectl port-forward -n yuvro-ns svc/ycode-backend 8000:80
curl http://localhost:8000/api/health/
```

### Monitoring & Observability

```bash
# View Prometheus metrics
kubectl get pods -n yuvro-observability

# Access Grafana dashboards
kubectl port-forward -n yuvro-observability svc/grafana 3000:80
# Open http://localhost:3000

# View traces in Jaeger
kubectl port-forward -n yuvro-observability svc/jaeger-ui 16686:16686
# Open http://localhost:16686
```

### Database Management

```bash
# Access RDS instance
psql -h ycode-rds.c123456.ap-south-1.rds.amazonaws.com \
     -U postgres \
     -d ycode_backend_db

# Run migrations
kubectl exec -it -n yuvro-ns deployment/ycode-backend -- \
  python manage.py migrate
```

### Troubleshooting

| Issue | Solution |
|---|---|
| Pod CrashLoopBackOff | Check logs: `kubectl logs -n yuvro-ns {pod}` |
| ImagePullBackOff | Verify GHCR credentials: `kubectl get secrets -n yuvro-ns` |
| Database connection timeout | Check RDS security groups |
| Service unreachable | Check ALB/NLB status |

---

## Environment Comparison

| Feature | Local K8s | Local Docker | Dev | Prod |
|---|---|---|---|---|
| **Location** | Local machine | Local machine | AWS EC2 | AWS EKS |
| **Orchestration** | Docker Desktop K8s | Docker Compose | Docker Compose | Managed EKS |
| **Databases** | In-cluster | Containers | Containers | AWS RDS |
| **Storage** | Volumes | Docker volumes | Docker volumes | AWS S3 |
| **Images** | Local build | Local build | EC2 build | GHCR registry |
| **Access** | NodePort localhost | localhost | EC2 IP/DNS | ALB/DNS |
| **SSL/TLS** | N/A | N/A | N/A | AWS Certificate Manager |
| **Hot Reload** | No | Yes ✅ | Yes ✅ | No |
| **Monitoring** | kubectl | docker ps | Docker logs | Prometheus/Grafana |
| **Cost** | Free | Free | Low | Higher |
| **Replicas** | 1 | 1 | 1 | 3+ |
| **Deploy Speed** | Slow (Helm) | Fast | Moderate | Moderate |
| **Best For** | K8s testing | Development | Team testing | Production |

---

## Quick Command Reference

### Local Kubernetes
```bash
# Deploy all apps
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s DEPLOY_BRANCH=main make deploy

# Check status
kubectl get pods -n yuvro-ns
kubectl logs -n yuvro-ns deployment/ycode-backend -f
```

### Local Docker Compose
```bash
# Deploy all apps (with hot reload)
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker DEPLOY_BRANCH=main make deploy

# Check status
docker ps
docker logs -f ycode-backend

# Stop services
DEPLOY_ENV=local DEPLOY_INFRA_TYPE=docker make stop
```

### Development (EC2)
```bash
# SSH into EC2
ssh -i key.pem ec2-user@EC2_IP

# Deploy via Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker logs -f ycode-backend
```

### Production (EKS)
```bash
# Deploy all apps
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks DEPLOY_BRANCH=main make deploy

# Check status
kubectl get pods -n yuvro-ns
helm list -n yuvro-ns

# Monitor rollout
kubectl rollout status deployment/ycode-backend -n yuvro-ns
```

---

**Last Updated:** October 7, 2026  
**Status:** Ready for all environments  
**Contact:** DevOps Team
