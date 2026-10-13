# Production EC2 Deployment

Deploy all Yuvro applications to a **single AWS EC2 instance** running Docker Compose.

## Quick Start

### 1. Deploy Infrastructure (Terraform)

```bash
# Initialize and deploy AWS infrastructure (VPC, RDS, EC2, Security Groups)
DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2 DEPLOY_BRANCH=main make deploy-infra

# View outputs (EC2 IP, SSH commands, etc.)
cd infra/opentofu/prod_ec2
terraform output
```

### 2. Deploy Applications

```bash
# All apps via single docker-compose.prod.yml
bash infra/scripts/prod_ec2/deploy-all.sh main
```

Or individual app guides (they all delegate to deploy-all.sh):
```bash
bash infra/scripts/prod_ec2/deploy-ycode.sh
bash infra/scripts/prod_ec2/deploy-ycampus.sh
bash infra/scripts/prod_ec2/deploy-ylabs.sh
bash infra/scripts/prod_ec2/deploy-yhub.sh
bash infra/scripts/prod_ec2/deploy-ymarketplace.sh
bash infra/scripts/prod_ec2/deploy-code-executor.sh
```

## Architecture

### Single EC2 Instance Setup

```
┌─────────────────────────────────────────┐
│     Single AWS EC2 Instance (Ubuntu)    │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │     Docker Engine                │  │
│  │                                  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ycode-backend (8000)      │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ycode-frontend (3000)     │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ycampus-backend (8001)    │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ycampus-frontend (3001)   │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ylabs-backend (8002)      │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ylabs-frontend (3002)     │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ yhub-backend (8003)       │  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ymarketplace-backend (8004)  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ ymarketplace-frontend(3004)  │  │
│  │  └───────────────────────────┘  │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │ code-executor (8009)      │  │  │
│  │  └───────────────────────────┘  │  │
│  │                                  │  │
│  │  All services on: yuvro-net     │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Security Group: prod-ec2-docker-sg   │
└─────────────────────────────────────────┘
         ↓
    AWS RDS PostgreSQL
         ↓
    Shared Database (prod-yuvro-db)
```

### Port Mapping

| Service | Frontend Port | Backend Port | Status |
|---------|---|---|---|
| YCode | 3000 | 8000 | ✓ Backend + Frontend |
| YCampus | 3001 | 8001 | ✓ Backend + Frontend |
| YLabs | 3002 | 8002 | ✓ Backend + Frontend |
| YHub | - | 8003 | ✓ Backend only |
| YMarketplace | 3004 | 8004 | ✓ Backend + Frontend |
| Code Executor | - | 8009 | ✓ Service only |

## Manual Deployment Steps

### 1. Get EC2 Instance Information

```bash
cd infra/opentofu/prod_ec2
terraform output ec2_elastic_ips
terraform output ec2_ssh_commands
```

### 2. Copy Repository to EC2

```bash
# Replace <EC2_IP> with your instance IP
scp -r -i /path/to/ec2-key.pem . ubuntu@<EC2_IP>:/home/ubuntu/yuvro
```

### 3. SSH into EC2

```bash
ssh -i /path/to/ec2-key.pem ubuntu@<EC2_IP>
```

### 4. On EC2, Setup Docker and Login

```bash
# Docker is installed by user_data script. Verify:
docker --version
docker-compose --version

# Login to GHCR (GitHub Container Registry)
# Replace TOKEN with your GitHub Personal Access Token
echo $GITHUB_TOKEN | docker login ghcr.io -u your_username --password-stdin
```

### 5. Deploy All Services

```bash
cd ~/yuvro

# Export branch variable
export DEPLOY_BRANCH=main

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 6. Verify Services

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test individual services
curl http://localhost:8000/api/health/        # YCode Backend
curl http://localhost:3000/                   # YCode Frontend
curl http://localhost:8001/api/health/        # YCampus Backend
curl http://localhost:3001/                   # YCampus Frontend
# etc...
```

## Common Operations

### Stop All Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### View Service Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs ycode-backend -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Restart a Service

```bash
docker-compose -f docker-compose.prod.yml restart ycode-backend
```

### Redeploy with Latest Images

```bash
# Pull latest images from GHCR
docker-compose -f docker-compose.prod.yml pull

# Restart with new images
docker-compose -f docker-compose.prod.yml up -d
```

### Update Environment Variables

Edit `.env.prod` files in each app directory, then:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Docker Compose Configuration

**File:** `docker-compose.prod.yml` (root level)

All services use:
- **Images:** From `ghcr.io/yuvro/{app}:{DEPLOY_BRANCH}`
- **Network:** Shared `yuvro-net` bridge network
- **Restart Policy:** `always` (auto-restart on failure)
- **Logging:** JSON file driver with rotation (10MB max per file, 3 files max)
- **Health Checks:** Enabled for all services

### Environment Variables

Each service reads from:
1. `<app>/.env.prod` (base configuration)
2. `<app>/.env.prod-secrets` (optional, for sensitive values)

### Database Connection

All services connect to shared AWS RDS:
- **Host:** Retrieved from Terraform outputs
- **Database:** Configured in `.env.prod` files
- **Credentials:** Stored in `.env.prod-secrets`

## Terraform Outputs

```bash
cd infra/opentofu/prod_ec2
terraform output
```

Returns:
- `ec2_instance_ids` - EC2 instance ID
- `ec2_elastic_ips` - Elastic IP address
- `ec2_public_ips` - Public IP address
- `ec2_ssh_commands` - SSH command to connect
- `rds_endpoint` - RDS database endpoint
- `uploads_bucket` - S3 bucket for file uploads
- `deployment_info` - Summary of deployment

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check health
docker ps | grep service-name
docker inspect service-name

# Verify image exists
docker images | grep ghcr.io/yuvro

# Try pulling latest
docker-compose -f docker-compose.prod.yml pull
```

### Database connection failed

```bash
# Check RDS endpoint in .env.prod
cat ycode-backend-api/.env.prod | grep DATABASE_URL

# Test connection from EC2
sudo apt-get install -y postgresql-client
psql postgresql://user:pass@prod-yuvro-db.xxxxx.us-east-1.rds.amazonaws.com:5432/ycode_db
```

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :8000

# Kill the process if needed
sudo kill -9 <PID>

# Or change port in docker-compose.prod.yml
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Check logs are not taking too much space
du -sh /var/lib/docker/containers/*/
```

## Configuration Files

- **Docker Compose:** `docker-compose.prod.yml`
- **Environment:** `*-api/.env.prod`, `*-api/.env.prod-secrets`
- **Terraform:** `infra/opentofu/prod_ec2/`
- **Scripts:** `infra/scripts/prod_ec2/`

## Security Notes

⚠️ **Important:**
- Keep EC2 key file secure (`chmod 600 ec2-key.pem`)
- Use VPN or IP whitelisting for SSH access
- Store `.env.prod-secrets` securely (not in git)
- Rotate database credentials regularly
- Enable CloudWatch monitoring (optional setup)

## Scaling & High Availability

Current setup uses **single EC2 instance** suitable for:
- Development/staging environments
- Small production deployments
- Testing

For production scale:
- Use **EKS** (Kubernetes) for auto-scaling
- Use **ECS** for managed containers
- Add load balancer (ALB/NLB) for multiple instances
- Use RDS read replicas for database scale

## Next Steps

1. Deploy infrastructure: `DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2 make deploy-infra`
2. Deploy applications: `bash infra/scripts/prod_ec2/deploy-all.sh main`
3. Configure custom domain: Point DNS to EC2 Elastic IP
4. Setup monitoring: Configure CloudWatch logs/metrics
5. Setup backups: Configure RDS automated backups
6. SSL/TLS: Configure Nginx reverse proxy or AWS Certificate Manager

## References

- Docker Compose: `docker-compose.prod.yml`
- Terraform: `infra/opentofu/prod_ec2/`
- Deployment Guide: `.kiro/steering/infra-deployment.md`
- User Data Script: `infra/opentofu/prod_ec2/user_data.sh`
