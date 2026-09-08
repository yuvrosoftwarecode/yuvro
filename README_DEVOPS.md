# DevOps Runbook

This document covers all infrastructure, deployment, and operational commands for the Yuvro platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure (OpenTofu)](#infrastructure-opentofu)
3. [Deploy Commands](#deploy-commands)
4. [SSH Access](#ssh-access)
5. [Fixture Data](#fixture-data)
6. [Database Operations](#database-operations)
7. [Service URLs](#service-urls)
8. [Logs and Debugging](#logs-and-debugging)
9. [Secrets Management](#secrets-management)

---

## Prerequisites

Install these tools before running any commands:

| Tool | Install |
|------|---------|
| OpenTofu | https://opentofu.org/docs/intro/install/ |
| AWS CLI | `brew install awscli` |
| SSH key | `~/.ssh/ycode-dev.pem` (chmod 400) |

Configure AWS credentials:
```bash
aws configure
# Region: ap-south-1
# Account: 878235034597
```

---

## Infrastructure (OpenTofu)

All infrastructure is in `infra/opentofu/`. State is stored locally in `terraform.tfstate`.

### Initialize

```bash
cd infra/opentofu
tofu init
```

### Plan changes

```bash
# All resources
tofu plan -var-file=dev.tfvars

# Specific resources only (e.g. new RDS instances)
tofu plan -var-file=dev.tfvars -target=module.rds_yhub -target=module.rds_ylabs
```

### Apply changes

```bash
# Full apply
tofu apply -var-file=dev.tfvars

# Apply saved plan
tofu plan -var-file=dev.tfvars -out=tfplan
tofu apply tfplan
```

### View outputs

```bash
tofu output                          # all outputs
tofu output -raw app_node_public_ips # EC2 IP
tofu output -raw yhub_db_endpoint    # YHub RDS endpoint (sensitive)
tofu output -raw ylabs_db_endpoint   # YLabs RDS endpoint (sensitive)
tofu output -raw ycode_db_endpoint   # YCode RDS endpoint (sensitive)
tofu output -raw ycampus_db_endpoint # YCampus RDS endpoint (sensitive)
```

### Current infrastructure (dev)

| Resource | Value |
|----------|-------|
| Region | ap-south-1 (Mumbai) |
| EC2 IP | 13.233.42.136 |
| EC2 Instance ID | i-088875ccdf6bc6175 |
| VPC | vpc-0893533f938d45e9d |
| S3 Bucket | yuvro-dev |
| AWS Account | 878235034597 |

**RDS instances:**

| Service | DB Name | Port |
|---------|---------|------|
| YCode | ycode | 5432 |
| YCampus | ycampus | 5432 |
| YHub | yhub | 5432 |
| YLabs | ylabs | 5432 |

### Destroy infrastructure

```bash
# Destroy all (WARNING: irreversible)
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy

# Destroy only specific RDS
tofu destroy -var-file=dev.tfvars -target=module.rds_yhub -target=module.rds_ylabs
```

---

## Deploy Commands

### Deploy all services (recommended)

```bash
# Deploy main branch
DEPLOY_BRANCH=main make deploy-all

# Deploy a feature branch
DEPLOY_BRANCH=ylabs_deploy make deploy-all
```

### Deploy individual services

```bash
DEPLOY_BRANCH=main make deploy-ycode
DEPLOY_BRANCH=main make deploy-ycampus
DEPLOY_BRANCH=main make deploy-ylabs
DEPLOY_BRANCH=ylabs_deploy make deploy-ylabs   # specific branch
DEPLOY_BRANCH=main make deploy-yhub
```

### How deploy works

1. Checks AWS credentials and EC2 status
2. If EC2 isn't running → provisions infra via OpenTofu
3. Wires RDS endpoints from `tofu output` into `.env.dev-secrets`
4. SCPs all `.env.dev-secrets` files to EC2 (gitignored, never committed)
5. SSHs into EC2, pulls the git branch, builds Docker images
6. Runs `docker compose up --force-recreate`
7. Reloads nginx
8. Runs `setup_fixtures_data` on each backend

### Scripts

```
infra/scripts/
├── lib/deploy-common.sh     # shared functions (source of truth)
├── deploy-all.sh            # deploys all services
├── deploy-ycode.sh          # deploys ycode only
├── deploy-ycampus.sh        # deploys ycampus only
├── deploy-ylabs.sh          # deploys ylabs only
├── deploy-yhub.sh           # deploys yhub only
└── deploy-dev-auto.sh       # legacy — delegates to deploy-all.sh
```

---

## SSH Access

### Connect to EC2

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136
```

### One-off remote commands

```bash
# Run any command on EC2
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "cd yuvro && <command>"

# Example: check running containers
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "docker ps"

# Example: view ylabs backend logs
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "cd yuvro && docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml -f docker-compose.dev.yml logs -f ylabs-backend"
```

### View all service logs

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "
  cd yuvro && docker compose \
    -f docker-compose.yuvro.yml \
    -f docker-compose.ycode.yml \
    -f docker-compose.ycampus.yml \
    -f docker-compose.ylabs.yml \
    -f docker-compose.yhub.yml \
    -f docker-compose.dev.yml \
    logs -f
"
```

### View logs for one service

```bash
# Replace <service> with: ycode-backend, ycampus-backend, ylabs-backend, yhub-backend,
#                         ycode-frontend, ycampus-frontend, ylabs-frontend, yuvro-code-executor
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "cd yuvro && docker logs -f --tail=100 yuvro-<service>-1"
```

---

## Fixture Data

### Run on all services (dev EC2)

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "
  for app in ycode ycampus ylabs yhub; do
    echo \"=== \$app ===\"
    docker exec yuvro-\${app}-backend-1 python manage.py setup_fixtures_data 2>&1 | tail -5
  done
"
```

### Run for a specific service

```bash
# YLabs
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec yuvro-ylabs-backend-1 python manage.py setup_fixtures_data"

# YHub
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec yuvro-yhub-backend-1 python manage.py setup_fixtures_data"

# YCode
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec yuvro-ycode-backend-1 python manage.py setup_fixtures_data"

# YCampus
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec yuvro-ycampus-backend-1 python manage.py setup_fixtures_data"
```

### Run via Make (local docker)

```bash
make setup-fixtures-data              # all services
make setup-fixtures-data-ylabs        # ylabs only
make setup-fixtures-data-yhub         # yhub only
make setup-fixtures-data-ycode        # ycode only
make setup-fixtures-data-ycampus      # ycampus only
```

---

## Database Operations

### Run Django management commands on EC2

```bash
# Django shell
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec -it yuvro-ylabs-backend-1 python manage.py shell"

# Run migrations manually
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec yuvro-ylabs-backend-1 python manage.py migrate"

# Create superuser
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 \
  "docker exec -it yuvro-ylabs-backend-1 python manage.py createsuperuser"
```

### Reset databases (local only — uses Docker volumes)

```bash
make db-reset-ycode      # reset ycode DB
make db-reset-ycampus    # reset ycampus DB
make db-reset-ylabs      # reset ylabs DB
make db-reset-yhub       # reset yhub DB
make db-reset            # reset all DBs
```

### Connect to RDS directly from EC2

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136

# Then from inside EC2 (requires psql installed):
# YHub
psql postgresql://yhub_admin:ChangeMe123!DevPassword@dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/yhub

# YLabs
psql postgresql://ylabs_admin:ChangeMe123!DevPassword@dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/ylabs
```

---

## Service URLs

### Dev environment

| Service | URL |
|---------|-----|
| YCode Frontend | https://code-dev.yuvro.ai |
| YCampus Frontend | https://campus-dev.yuvro.ai |
| YCode Backend API | https://backend-code-dev.yuvro.ai/api |
| YCampus Backend API | https://backend-campus-dev.yuvro.ai/api |
| Code Executor | https://code-executer-dev.yuvro.ai |
| YHub Backend API | https://backend-hub-dev.yuvro.ai/api |
| YLabs Frontend | https://dev.yuvrolabs.com |
| YLabs Backend API | https://backend-dev.yuvrolabs.com/api |

### API docs (Swagger)

```
https://backend-code-dev.yuvro.ai/api/docs/
https://backend-campus-dev.yuvro.ai/api/docs/
https://backend-hub-dev.yuvro.ai/api/docs/
https://backend-dev.yuvrolabs.com/api/docs/
```

---

## Logs and Debugging

### Check container status on EC2

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### Check nginx config

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "sudo nginx -t"
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "sudo systemctl status nginx"
```

### Reload nginx after config change

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "
  sudo cp yuvro/infra/nginx/yuvro-dev.conf /etc/nginx/sites-available/yuvro-dev
  sudo nginx -t && sudo systemctl reload nginx
"
```

### Restart a specific service

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "
  cd yuvro && docker compose \
    -f docker-compose.yuvro.yml \
    -f docker-compose.ylabs.yml \
    -f docker-compose.dev.yml \
    restart ylabs-backend
"
```

### Disk usage

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "df -h && docker system df"
```

### Free up disk space

```bash
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "
  docker image prune -f
  docker builder prune -f --keep-storage 5GB
"
```

---

## Secrets Management

Secrets are **gitignored** and must be maintained manually. They live in `*.env.dev-secrets` files.

### Files that must exist locally before deploying

```
ycode-backend-api/.env.dev-secrets
ycampus-backend-api/.env.dev-secrets
yhub-backend-api/.env.dev-secrets
ylabs-backend-api/.env.dev-secrets
ycode-web/.env.dev-secrets          # VITE_GOOGLE_CLIENT_ID
ycampus-web/.env.dev-secrets        # VITE_GOOGLE_CLIENT_ID
ylabs-web/.env.dev-secrets          # VITE_GOOGLE_CLIENT_ID (optional)
yuvro-code-executer/.env.dev-secrets
```

The deploy script automatically:
- Reads RDS endpoints from `tofu output` and injects them into `DATABASE_URL`
- SCPs all secrets to EC2 before building

### Update a secret on EC2 without full redeploy

```bash
# 1. Edit the local file
vim yhub-backend-api/.env.dev-secrets

# 2. SCP to EC2
scp -i ~/.ssh/ycode-dev.pem yhub-backend-api/.env.dev-secrets \
  ubuntu@13.233.42.136:/home/ubuntu/yuvro/yhub-backend-api/.env.dev-secrets

# 3. Restart the backend to pick up the new env
ssh -i ~/.ssh/ycode-dev.pem ubuntu@13.233.42.136 "
  cd yuvro && docker compose \
    -f docker-compose.yuvro.yml -f docker-compose.yhub.yml -f docker-compose.dev.yml \
    up -d --force-recreate yhub-backend
"
```

---

## Port Reference

| Service | Host Port | Container Port |
|---------|-----------|----------------|
| YCode Frontend | 3000 | 80 (nginx) |
| YCampus Frontend | 3001 | 80 (nginx) |
| YLabs Frontend | 3002 | 3000 (vite) |
| YCode Backend | 8000 | 8000 |
| YCampus Backend | 8001 | 8000 |
| YLabs Backend | 8002 | 8000 |
| YHub Backend | 8003 | 8000 |
| Code Executor | 8009 | 8009 |
| Workspace Preview | 8010 | host port |
