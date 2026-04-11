# 🚀 Deploying to AWS EC2 - Complete Guide

## Overview

When using `DEPLOY_ENV=dev`, the deployment is designed for AWS EC2, not local Docker. This guide explains how to deploy to AWS EC2.

---

## 📋 Deployment Options

### Option 1: Local Development (Docker Compose)

```bash
make install
```

**What happens:**
- Uses local Docker daemon
- Runs on localhost
- Perfect for development

---

### Option 2: AWS EC2 with Kubernetes (Recommended)

```bash
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
```

**What happens:**
- Deploys to AWS EC2 Kubernetes cluster
- Uses Helm charts
- Managed from your local machine

**Requirements:**
- AWS EC2 instances with Kubernetes
- kubectl configured
- Helm installed

---

### Option 3: AWS EC2 with Docker (Manual)

```bash
DEPLOY_ENV=dev make install
```

**What happens:**
- Shows instructions for manual deployment
- Does NOT use local Docker daemon
- Requires SSH access to EC2 instance

**Why manual?**
- Prevents accidental local Docker usage
- Ensures deployment goes to AWS EC2
- Requires explicit SSH connection

---

## 🔧 Deploying to AWS EC2 with Docker

### Step 1: SSH into EC2 Instance

```bash
# Get your EC2 instance IP from AWS Console
EC2_IP="your-ec2-instance-ip"

# SSH into the instance
ssh -i your-key.pem ec2-user@$EC2_IP
# or
ssh -i your-key.pem ubuntu@$EC2_IP
```

### Step 2: Clone Repository

```bash
# On the EC2 instance
git clone https://github.com/your-org/yuvro-code.git
cd yuvro-code
```

### Step 3: Configure Environment

```bash
# Copy .env files
cp ycode-backend-api/.env.example ycode-backend-api/.env.dev
cp ycampus-backend-api/.env.example ycampus-backend-api/.env.dev
cp ycode-web/.env.example ycode-web/.env.dev
cp ycampus-web/.env.example ycampus-web/.env.dev

# Edit .env files with RDS endpoints
nano ycode-backend-api/.env.dev
nano ycampus-backend-api/.env.dev
```

### Step 4: Install Docker (if not already installed)

```bash
# On the EC2 instance
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -aG docker $USER
```

### Step 5: Deploy

```bash
# On the EC2 instance
DEPLOY_ENV=dev make install
```

### Step 6: Access Services

```bash
# From your local machine, SSH port forward
ssh -i your-key.pem -L 3000:localhost:3000 -L 8001:localhost:8001 ec2-user@$EC2_IP

# Then access
# http://localhost:3000 (YCode Frontend)
# http://localhost:8001 (YCode Backend)
```

---

## 🎯 Deploying to AWS EC2 with Kubernetes

### Step 1: Verify Prerequisites

```bash
# On your local machine
kubectl cluster-info
helm version
```

### Step 2: Deploy

```bash
# From your local machine
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
```

### Step 3: Check Status

```bash
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make status
```

### Step 4: Setup Port Forwarding

```bash
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make port-forward
```

### Step 5: Access Services

```bash
# In another terminal
# http://localhost:3000 (YCode Frontend)
# http://localhost:8001 (YCode Backend)
# http://localhost:3002 (YCampus Frontend)
# http://localhost:8003 (YCampus Backend)
```

---

## ⚠️ Why Local Docker Doesn't Work for Dev

When you run `DEPLOY_ENV=dev make install` on your local machine:

```bash
DEPLOY_ENV=dev make install
▶ DEPLOY_ENV=dev  DEPLOY_TYPE=docker
🚀 Starting all services [DEPLOY_ENV=dev, DEPLOY_TYPE=docker]...
⚠️  Dev environment with Docker requires manual deployment to AWS EC2
```

**Why?**
- Dev environment is meant for AWS EC2, not local machine
- Using local Docker would bypass AWS infrastructure
- Prevents accidental local deployments

**What to do instead:**
1. Use Kubernetes: `DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install`
2. SSH to EC2 and run: `DEPLOY_ENV=dev make install`
3. Use local: `make install` (for local development)

---

## 📊 Deployment Matrix

| Scenario | Command | Location | Docker Daemon |
|----------|---------|----------|----------------|
| Local Dev | `make install` | Local machine | Local |
| Dev with K8s | `DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install` | AWS EC2 | N/A (K8s) |
| Dev with Docker | SSH to EC2, then `DEPLOY_ENV=dev make install` | AWS EC2 | EC2's Docker |
| Staging | `DEPLOY_ENV=staging make install` | Kubernetes | N/A (K8s) |
| Production | `DEPLOY_ENV=prod make install` | Kubernetes | N/A (K8s) |

---

## 🔄 Common Commands

### Local Development

```bash
# Start
make install

# Stop
make stop

# Logs
make logs

# Status
docker compose ps

# Clean
make clean
```

### Dev with Kubernetes

```bash
# Deploy
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

### Dev with Docker (on EC2)

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Deploy
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

---

## 🛠️ Troubleshooting

### Error: "unable to get image 'yuvro-yuvro-code-executor': Cannot connect to the Docker daemon"

**Cause:** Running `DEPLOY_ENV=dev make install` on local machine

**Solution:**
```bash
# Option 1: Use Kubernetes instead
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install

# Option 2: SSH to EC2 and deploy there
ssh -i your-key.pem ec2-user@your-ec2-ip
DEPLOY_ENV=dev make install

# Option 3: Use local development instead
make install
```

### Error: "Kubernetes cluster not accessible"

**Cause:** kubectl not configured or cluster not running

**Solution:**
```bash
# Verify kubectl is configured
kubectl cluster-info

# If not configured, setup kubeconfig
# See AWS documentation for your cluster setup
```

### Error: "Helm is not installed"

**Cause:** Helm not installed on local machine

**Solution:**
```bash
# Install Helm
brew install helm

# Verify installation
helm version
```

---

## 📝 Environment Files

### Dev Environment (.env.dev)

```bash
# ycode-backend-api/.env.dev
DATABASE_URL=postgresql://ycode_admin:password@dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432/ycode
DB_HOST=dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=ycode
DB_USER=ycode_admin
DB_PASSWORD=password
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🎯 Best Practices

1. **Use Kubernetes for Dev**
   - More similar to production
   - Easier to manage
   - Better resource isolation

2. **Use Local Docker for Development**
   - Faster iteration
   - Easier debugging
   - No AWS costs

3. **Use Docker on EC2 for Testing**
   - Test on actual EC2 instance
   - Verify Docker configuration
   - Before moving to Kubernetes

4. **Keep Environments Separate**
   - Local: `.env.local`
   - Dev: `.env.dev`
   - Staging: `.env.staging`
   - Prod: `.env.prod`

---

## 📚 Related Documentation

- `DEPLOYMENT_MODEL_FINAL.md` - Deployment model overview
- `DEPLOYMENT_FINAL_SUMMARY.md` - Quick reference
- `SETUP_AND_START.md` - Local development setup
- `DEPLOY_DEV_AWS.md` - AWS EC2 deployment details
- `DEPLOY_COMMANDS.md` - All available commands

---

## ✨ Summary

| Task | Command | Location |
|------|---------|----------|
| Local development | `make install` | Local machine |
| Deploy to AWS EC2 (K8s) | `DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install` | Local machine (deploys to AWS) |
| Deploy to AWS EC2 (Docker) | SSH to EC2, then `DEPLOY_ENV=dev make install` | AWS EC2 instance |
| Deploy to staging | `DEPLOY_ENV=staging make install` | Local machine (deploys to K8s) |
| Deploy to production | `DEPLOY_ENV=prod make install` | Local machine (deploys to K8s) |

---

## 🚀 Ready to Deploy?

Choose your deployment method:

1. **Local Development** (fastest)
   ```bash
   make install
   ```

2. **AWS EC2 with Kubernetes** (recommended)
   ```bash
   DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
   ```

3. **AWS EC2 with Docker** (manual)
   ```bash
   # SSH to EC2 first
   ssh -i your-key.pem ec2-user@your-ec2-ip
   DEPLOY_ENV=dev make install
   ```

Happy deploying! 🎉
