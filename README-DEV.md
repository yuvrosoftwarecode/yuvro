# Yuvro Development Guide

This guide covers local and development environment setup for the Yuvro platform using both Docker and Kubernetes.

## Platform Overview

Yuvro consists of two main platforms running in parallel:

### YCode Platform
- **Frontend**: http://localhost:3000 (Docker) or http://localhost:3000 (K8s with port-forward)
- **Backend API**: http://localhost:8001
- **Database**: PostgreSQL on port 5432

### YCampus Platform
- **Frontend**: http://localhost:3002 (Docker) or http://localhost:3002 (K8s with port-forward)
- **Backend API**: http://localhost:8003
- **Database**: PostgreSQL on port 5433

### Code Executor Service
- **API**: http://localhost:8002
- **Purpose**: Isolated code execution for Python, JavaScript, Java, C++, C

### Observability Stack (Optional)
- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100

## Quick Start

### Prerequisites
- Docker & Docker Compose (for Docker deployments)
- Kubernetes cluster (for K8s deployments - Docker Desktop Kubernetes works locally)
- kubectl (for K8s deployments)
- Helm 3+ (for K8s deployments)
- Make

### Environment Variables

Set deployment environment and type:
```bash
# Local environment (default)
DEPLOY_ENV=local DEPLOY_TYPE=docker make install

# Development environment
DEPLOY_ENV=dev DEPLOY_TYPE=docker make install

# Kubernetes on local
DEPLOY_ENV=local DEPLOY_TYPE=k8s make install

# Staging/Production (requires K8s)
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make install
```

**Environment Options:**
- `DEPLOY_ENV`: `local` (default) | `dev` | `staging` | `prod`
- `DEPLOY_TYPE`: `docker` (default for local/dev) | `k8s` (default for staging/prod)

## Docker Deployment

### Start All Services
```bash
# Start all services (local environment, Docker)
make install

# Start all services (dev environment, Docker)
DEPLOY_ENV=dev make install

# Alias for install
make run
```

### Start Platform-Specific Services
```bash
# Start only YCode services
make install-ycode

# Start only YCampus services
make install-ycampus

# Aliases
make run-ycode
make run-ycampus
```

### Stop Services
```bash
# Stop all services
make stop

# Stop specific platform
make stop-ycode
make stop-ycampus
```

### Clean Up
```bash
# Clean all containers and volumes
make clean

# Clean specific platform
make clean-ycode
make clean-ycampus
```

### View Logs
```bash
# View all logs
make logs

# View specific platform logs
make logs-ycode
make logs-ycampus
```

### Check Status
```bash
make status
```

## Kubernetes Deployment

### Prerequisites for Local K8s
1. Enable Kubernetes in Docker Desktop:
   - Docker Desktop → Preferences → Kubernetes → Enable Kubernetes
   - Wait for cluster to be ready

2. Verify cluster access:
   ```bash
   kubectl cluster-info
   ```

### Start All Services on Kubernetes
```bash
# Deploy to local Kubernetes
DEPLOY_TYPE=k8s make install

# Deploy to dev Kubernetes
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install

# Deploy to staging
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install

# Deploy to production
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make install
```

### Start Platform-Specific Services on Kubernetes
```bash
# Deploy only YCode
DEPLOY_TYPE=k8s make install-ycode

# Deploy only YCampus
DEPLOY_TYPE=k8s make install-ycampus
```

### Stop Kubernetes Deployments
```bash
# Stop all services
DEPLOY_TYPE=k8s make stop

# Stop specific platform
DEPLOY_TYPE=k8s make stop-ycode
DEPLOY_TYPE=k8s make stop-ycampus
```

### Clean Up Kubernetes Resources
```bash
# Clean all resources
DEPLOY_TYPE=k8s make clean

# Clean specific platform
DEPLOY_TYPE=k8s make clean-ycode
DEPLOY_TYPE=k8s make clean-ycampus
```

### View Kubernetes Logs
```bash
# View all logs
DEPLOY_TYPE=k8s make logs

# View specific platform logs
DEPLOY_TYPE=k8s make logs-ycode
DEPLOY_TYPE=k8s make logs-ycampus
```

### Check Kubernetes Status
```bash
DEPLOY_TYPE=k8s make status
```

### Port Forwarding (K8s Only)
To access services locally when running on Kubernetes:
```bash
# First, ensure services are deployed
DEPLOY_TYPE=k8s make install

# Then in another terminal, set up port forwarding
DEPLOY_TYPE=k8s make port-forward
```

This sets up port forwards for:
- YCode Frontend: localhost:3000
- YCode Backend: localhost:8001
- YCampus Frontend: localhost:3002
- YCampus Backend: localhost:8003
- Code Executor: localhost:8002

**Note**: Services must be fully deployed before port-forward will work. Check deployment status with:
```bash
DEPLOY_TYPE=k8s make status
```

## Database Management

### Run Migrations
```bash
# Run migrations for all services
make makemigrations

# Run migrations for specific platform
make makemigrations-ycode
make makemigrations-ycampus
```

### Load Test Data
```bash
# Load test data for YCode
make load-fixtures-ycode

# Load test data for YCampus
make load-fixtures-ycampus
```

## Code Quality

### Run All Tests
```bash
make test-all
```

### Format Code
```bash
make format-all
```

### Lint Code
```bash
make lint-all
```

### Run All Checks
```bash
make check-all
```

## Observability

### Start with Observability Stack (Docker)
```bash
make observability-dev
```

### View Observability Dashboards
```bash
make observability-dashboards
```

### Stop Observability Stack
```bash
make observability-stop
```

### Clean Observability Resources
```bash
make observability-clean
```

## Common Workflows

### Local Development with Docker
```bash
# Start all services
make install

# View logs
make logs

# Make code changes...

# Stop services
make stop

# Clean up
make clean
```

### Local Development with Kubernetes
```bash
# Enable Kubernetes in Docker Desktop first

# Deploy all services
DEPLOY_TYPE=k8s make install

# Set up port forwarding in another terminal
DEPLOY_TYPE=k8s make port-forward

# View logs
DEPLOY_TYPE=k8s make logs

# Make code changes...

# Stop services
DEPLOY_TYPE=k8s make stop

# Clean up
DEPLOY_TYPE=k8s make clean
```

### Testing Kubernetes Locally Before Staging
```bash
# Deploy to local K8s with staging values
DEPLOY_ENV=local DEPLOY_TYPE=k8s make install

# Verify deployment
DEPLOY_TYPE=k8s make status

# Set up port forwarding
DEPLOY_TYPE=k8s make port-forward

# Test services...

# Clean up
DEPLOY_TYPE=k8s make clean
```

### Deploy to Staging
```bash
# Deploy all services to staging
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install

# Check status
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make status

# View logs
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make logs
```

### Deploy to Production
```bash
# Deploy all services to production
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make install

# Check status
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make status

# View logs
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make logs
```

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Clean everything and restart
make clean
make install
```

**Port conflicts:**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8001
lsof -i :3002
lsof -i :8003
lsof -i :8002

# Kill the process if needed
kill -9 <PID>
```

### Kubernetes Issues

**Cluster not accessible:**
```bash
# Verify cluster is running
kubectl cluster-info

# Check nodes
kubectl get nodes

# Enable Kubernetes in Docker Desktop if needed
```

**Pods in CrashLoopBackOff:**
```bash
# Check pod logs to see the error
kubectl logs -n ycode yuvro-ycode-backend-<pod-id> --tail=100

# Common issues:
# 1. Missing environment variables - check secrets are created
kubectl get secrets -n ycode

# 2. Database connection issues - verify DATABASE_HOST is correct
kubectl exec -it -n ycode yuvro-ycode-backend-<pod-id> -- env | grep DATABASE

# 3. Application startup issues - check if WSGI app path is correct
# The Dockerfile should specify the correct WSGI application

# 4. Missing dependencies - check if all Python packages are installed
# Verify requirements.txt is included in the Docker image
```

**Images not found:**
```bash
# Ensure images are built locally
docker build -t ycode-backend:latest yc-backend-api/
docker build -t ycode-frontend:latest yc-web/
docker build -t ycampus-backend:latest ycampus-backend-api/
docker build -t ycampus-frontend:latest ycampus-web/
docker build -t yc-code-executor:latest yc-code-executor/

# Then deploy
DEPLOY_TYPE=k8s make install
```

**Helm dependency issues:**
```bash
# Update Helm dependencies
helm dependency update helm

# Try deployment again
DEPLOY_TYPE=k8s make install
```

**Port-forward not working:**
```bash
# Ensure services are deployed first
DEPLOY_TYPE=k8s make status

# If services show "NotFound", wait for deployment to complete
# Services take a few minutes to start

# Check if services exist
kubectl get svc -A | grep yuvro

# Check if pods are running (not CrashLoopBackOff)
kubectl get pods -A | grep yuvro

# If pods are in CrashLoopBackOff, check logs
kubectl logs -n ycode yuvro-ycode-backend-<pod-id> --tail=50
kubectl logs -n ycampus yuvro-ycampus-backend-<pod-id> --tail=50

# Try port-forward again
DEPLOY_TYPE=k8s make port-forward

# If still failing, check service names
kubectl get svc -n ycode
kubectl get svc -n ycampus
kubectl get svc -n yuvro

# Verify port-forward is working
curl http://localhost:3000  # YCode Frontend
curl http://localhost:8001  # YCode Backend
curl http://localhost:3002  # YCampus Frontend
curl http://localhost:8003  # YCampus Backend
curl http://localhost:8002  # Code Executor
```

## Architecture

### Docker Compose Structure
- `docker-compose.yuvro.yml`: Core services (databases, networks)
- `docker-compose.ycode.yml`: YCode platform services
- `docker-compose.ycampus.yml`: YCampus platform services
- `docker-compose.local.yml`: Local environment overrides (with code volumes)
- `docker-compose.dev.yml`: Dev environment overrides (without volumes)
- `docker-compose.yobservability.yml`: Observability stack

### Kubernetes Structure
- `helm/`: Umbrella chart with subcharts for each service
- `helm/values-local.yaml`: Local environment values
- `helm/values-dev.yaml`: Dev environment values
- `helm/values-staging.yaml`: Staging environment values
- `helm/values-prod.yaml`: Production environment values

### Namespaces
- `yuvro`: Main application namespace
- `yobservability`: Observability stack namespace
- `ycode`: YCode platform namespace
- `ycampus`: YCampus platform namespace

## Environment Configuration

### Local Environment
- **Docker**: Uses local images without registry
- **K8s**: Uses local images with hostpath storage
- **Databases**: In-container PostgreSQL
- **Observability**: Optional, local stack

### Dev Environment
- **Docker**: Uses dev-tagged images
- **K8s**: Uses dev-tagged images with local registry
- **Databases**: In-container PostgreSQL
- **Observability**: Optional, local stack

### Staging Environment
- **K8s**: Uses staging-tagged images from ECR
- **Databases**: External RDS PostgreSQL
- **Observability**: CloudWatch + X-Ray
- **Ingress**: Nginx with TLS

### Production Environment
- **K8s**: Uses prod-tagged images from ECR
- **Databases**: External RDS PostgreSQL
- **Observability**: CloudWatch + X-Ray
- **Ingress**: Nginx with TLS
- **HPA**: Auto-scaling enabled

## Important Commands Reference

```bash
# Installation & Deployment
make install                    # Start all services (local, docker)
make install-ycode             # Start YCode only
make install-ycampus           # Start YCampus only
DEPLOY_TYPE=k8s make install   # Deploy to Kubernetes

# Running Services
make run                        # Alias for install
make run-ycode                  # Alias for install-ycode
make run-ycampus                # Alias for install-ycampus

# Stopping Services
make stop                       # Stop all services
make stop-ycode                 # Stop YCode only
make stop-ycampus               # Stop YCampus only

# Cleanup
make clean                      # Clean all containers/volumes
make clean-ycode                # Clean YCode only
make clean-ycampus              # Clean YCampus only

# Monitoring
make status                     # Check deployment status
make logs                       # View all logs
make logs-ycode                 # View YCode logs
make logs-ycampus               # View YCampus logs
DEPLOY_TYPE=k8s make port-forward  # Setup K8s port forwarding

# Database
make makemigrations             # Run migrations
make load-fixtures-ycode        # Load YCode test data
make load-fixtures-ycampus      # Load YCampus test data

# Code Quality
make test-all                   # Run all tests
make format-all                 # Format all code
make lint-all                   # Lint all code
make check-all                  # Run all checks

# Observability
make observability-dev          # Start observability stack
make observability-dashboards   # Show dashboard URLs
make observability-stop         # Stop observability stack
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs: `make logs` or `DEPLOY_TYPE=k8s make logs`
3. Check status: `make status` or `DEPLOY_TYPE=k8s make status`
4. Review Makefile for available commands: `make help`
