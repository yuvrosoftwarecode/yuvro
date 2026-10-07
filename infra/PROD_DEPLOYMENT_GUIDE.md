# Production Deployment Guide

This guide covers deploying Yuvro to AWS Kubernetes with a consolidated RDS database (prod-yuvro-db).

## Architecture

- **Database**: Single consolidated PostgreSQL RDS instance (prod-yuvro-db)
- **Container Registry**: Docker Hub or AWS ECR
- **Orchestration**: AWS EKS (Elastic Kubernetes Service)
- **Applications**: 5 microservices + 1 code executor
- **Load Balancer**: AWS NLB via Kubernetes Service
- **SSL/TLS**: Let's Encrypt with cert-manager

## Prerequisites

### Local Tools
- `aws-cli` v2+ configured with production credentials
- `kubectl` v1.24+
- `helm` v3.10+
- `tofu` (OpenTofu) v1.6+
- `docker` (for building images)
- `git` with SSH access

### AWS Setup
- EKS cluster already provisioned (`yuvro-prod-cluster`)
- VPC with private/public subnets configured
- Security groups for RDS and Kubernetes nodes

### Credentials
- AWS IAM role with permissions for:
  - RDS, EKS, EC2, VPC, IAM, S3, CloudWatch
  - Route53 (for DNS validation)
  - Secrets Manager (for sensitive data)

## Step 1: Provision Production Infrastructure

### Create Production RDS Instance

```bash
cd infra/opentofu

# Initialize Terraform
tofu init -upgrade

# Preview changes
tofu plan -var-file="prod.tfvars" -out=prod.tfplan

# Apply infrastructure
tofu apply prod.tfplan

# Get RDS endpoint
tofu output -raw prod_rds_endpoint
# Output: prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com
```

### Verify RDS Accessibility

```bash
# Install PostgreSQL client
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Test connection
PGPASSWORD="ChangeMe123!ProdPassword" psql \
  -h prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U yuvro_admin \
  -d postgres \
  -c "SELECT version();"
```

## Step 2: Migrate Data from Dev to Production

### Option A: Automatic Migration Script

```bash
# Set environment variables
export DEV_RDS_HOST="dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
export PROD_RDS_HOST="prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
export RDS_USER="yuvro_admin"
export RDS_PASSWORD="ChangeMe123!DevPassword"
export PROD_PASSWORD="ChangeMe123!ProdPassword"

# Run migration
bash infra/scripts/utils/migrate-dev-to-prod.sh
```

### Option B: Manual Migration

```bash
# Dump all databases from dev
for db in ycode ycampus ylabs yhub ymarketplace; do
  PGPASSWORD="ChangeMe123!DevPassword" pg_dump \
    -h dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
    -U yuvro_admin \
    -d "$db" \
    -F c \
    -f "/tmp/$db.dump"
done

# Create databases in prod
for db in ycode ycampus ylabs yhub ymarketplace; do
  PGPASSWORD="ChangeMe123!ProdPassword" psql \
    -h prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
    -U yuvro_admin \
    -d postgres \
    -c "CREATE DATABASE $db;"
done

# Restore all databases to prod
for db in ycode ycampus ylabs yhub ymarketplace; do
  PGPASSWORD="ChangeMe123!ProdPassword" pg_restore \
    -h prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
    -U yuvro_admin \
    -d "$db" \
    -F c \
    "/tmp/$db.dump"
done
```

## Step 3: Configure EKS Cluster

### Get Cluster Credentials

```bash
aws eks update-kubeconfig \
  --name yuvro-prod-cluster \
  --region ap-south-1
```

### Verify Cluster Access

```bash
kubectl cluster-info
kubectl get nodes
kubectl get namespaces
```

## Step 4: Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace yuvro-production

# Create database credentials secret
kubectl create secret generic yuvro-db-credentials \
  --from-literal=username=yuvro_admin \
  --from-literal=password=ChangeMe123!ProdPassword \
  -n yuvro-production
```

## Step 5: Deploy Applications via Helm

### Install cert-manager (One-time)

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait
```

### Deploy All Applications

```bash
helm upgrade --install yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --set global.database.host=prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  --set global.database.masterUser=yuvro_admin \
  --set global.database.masterPassword=ChangeMe123!ProdPassword \
  --set global.environment=production \
  --set ycode.enabled=true \
  --set ycampus.enabled=true \
  --set ylabs.enabled=true \
  --set yhub.enabled=true \
  --set ymarketplace.enabled=true \
  --set codeExecutor.enabled=true \
  --wait \
  --timeout 10m
```

### Deploy Individual Applications

```bash
# Deploy only YCode
helm upgrade --install yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  --set global.database.host=prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  --set global.database.masterUser=yuvro_admin \
  --set global.database.masterPassword=ChangeMe123!ProdPassword \
  --set ycode.enabled=true \
  --set ycampus.enabled=false \
  --set ylabs.enabled=false \
  --set yhub.enabled=false \
  --set ymarketplace.enabled=false \
  --set codeExecutor.enabled=false \
  --wait
```

## Step 6: Configure DNS and SSL

### Create ClusterIssuer for Let's Encrypt

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yuvro.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Configure Route53 DNS Records

Map production domains to the load balancer:
- `code.yuvro.ai` → Load Balancer IP
- `backend-code.yuvro.ai` → Load Balancer IP
- `campus.yuvro.ai` → Load Balancer IP
- `backend-campus.yuvro.ai` → Load Balancer IP
- `labs.yuvro.ai` → Load Balancer IP
- `backend-labs.yuvro.ai` → Load Balancer IP
- `backend-hub.yuvro.ai` → Load Balancer IP
- `marketplace.yuvro.ai` → Load Balancer IP
- `backend-marketplace.yuvro.ai` → Load Balancer IP
- `code-executor.yuvro.ai` → Load Balancer IP

```bash
# Get load balancer IP
kubectl get svc -n yuvro-production
```

## Verification Checklist

### Infrastructure Verification

- [ ] RDS instance prod-yuvro-db exists and is accessible
- [ ] All 5 databases created (ycode, ycampus, ylabs, yhub, ymarketplace)
- [ ] Data migrated with row count verification
- [ ] EKS cluster running with production security configuration
- [ ] VPC security groups configured for RDS access

### Kubernetes Verification

- [ ] Namespace `yuvro-production` created
- [ ] Database secrets available in namespace
- [ ] All deployments in RUNNING state

```bash
kubectl get deployments -n yuvro-production
kubectl get pods -n yuvro-production
kubectl get svc -n yuvro-production
```

### Application Verification

- [ ] All 5 apps responding to health checks
- [ ] Database connections working

```bash
# Check pod logs
kubectl logs -n yuvro-production -l app=ycode-backend --tail=50

# Test health endpoint
kubectl port-forward -n yuvro-production \
  svc/ycode-backend 8000:80 &
curl http://localhost:8000/api/health/
```

### SSL/TLS Verification

- [ ] Certificates issued by Let's Encrypt
- [ ] All domains accessible via HTTPS
- [ ] Certificate renewal configured

```bash
kubectl get certificate -n yuvro-production
kubectl describe cert -n yuvro-production

# Test HTTPS access
curl https://code.yuvro.ai/
```

### Data Integrity Verification

- [ ] User accounts accessible in production
- [ ] Courses/content visible
- [ ] Database backups configured

```bash
# Query production database
PGPASSWORD="ChangeMe123!ProdPassword" psql \
  -h prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
  -U yuvro_admin \
  -d ycode \
  -c "SELECT COUNT(*) FROM authentication_user;"
```

## Rollback Procedure

### If Migration Fails

```bash
# Destroy production databases
for db in ycode ycampus ylabs yhub ymarketplace; do
  PGPASSWORD="ChangeMe123!ProdPassword" psql \
    -h prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com \
    -U yuvro_admin \
    -d postgres \
    -c "DROP DATABASE $db;"
done

# Re-migrate with corrected procedure
bash infra/scripts/utils/migrate-dev-to-prod.sh
```

### If Helm Deployment Fails

```bash
# Delete Helm release
helm uninstall yuvro -n yuvro-production

# Fix issues, re-deploy
helm upgrade --install yuvro ./helm/yuvro-production \
  --namespace yuvro-production \
  # ... (with corrected values)
```

## Monitoring

### View Application Logs

```bash
# Real-time logs for all pods
kubectl logs -n yuvro-production -f --all-containers=true

# Logs for specific deployment
kubectl logs -n yuvro-production -f deployment/ycode-backend

# Previous logs (if pod crashed)
kubectl logs -n yuvro-production deployment/ycode-backend --previous
```

### Monitor Resource Usage

```bash
kubectl top nodes
kubectl top pods -n yuvro-production
```

### Check Event History

```bash
kubectl describe pod -n yuvro-production <pod-name>
kubectl get events -n yuvro-production --sort-by='.lastTimestamp'
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod -n yuvro-production <pod-name>

# Check events
kubectl get events -n yuvro-production

# Check logs
kubectl logs -n yuvro-production <pod-name>
```

### Database Connection Issues

```bash
# Verify security group allows access
aws ec2 describe-security-groups --region ap-south-1 | grep -A 5 prod-rds

# Check RDS availability
aws rds describe-db-instances \
  --db-instance-identifier prod-yuvro-db \
  --region ap-south-1 | grep -E "DBInstanceStatus|Endpoint"
```

### Certificate Issues

```bash
# Check certificate status
kubectl describe certificate -n yuvro-production

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager -f
```

## Support

For issues or questions:
1. Check logs: `kubectl logs -n yuvro-production -f`
2. Verify DNS: `nslookup code.yuvro.ai`
3. Test connectivity: `curl -v https://code.yuvro.ai/`
4. Review RDS status: AWS Console → RDS → Databases
5. Check Kubernetes events: `kubectl get events -n yuvro-production`
