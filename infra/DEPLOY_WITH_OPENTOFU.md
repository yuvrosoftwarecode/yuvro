# 🚀 Deploy to AWS EC2 with OpenTofu

## Overview

`DEPLOY_ENV=dev make install` now uses OpenTofu to automatically deploy EC2 instances and RDS databases to AWS.

---

## 📋 Prerequisites

### 1. Install OpenTofu

```bash
# macOS with Homebrew
brew install opentofu

# Or download from
https://opentofu.org/docs/intro/install/

# Verify installation
tofu version
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# When prompted:
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: ap-south-1
# Default output format: json

# Verify credentials
aws sts get-caller-identity
```

### 3. Install AWS CLI

```bash
# macOS with Homebrew
brew install awscli

# Verify installation
aws --version
```

---

## 🚀 Deploy to AWS EC2

### Step 1: Deploy Infrastructure

```bash
# From project root
DEPLOY_ENV=dev make install
```

**What happens:**
1. Validates prerequisites (OpenTofu, AWS credentials)
2. Initializes OpenTofu
3. Plans the deployment (shows what will be created)
4. Asks for confirmation
5. Applies the configuration (creates EC2 instances and RDS)

### Step 2: Review the Plan

When prompted, review the resources that will be created:
- EC2 instances
- RDS databases
- VPC and security groups
- S3 buckets
- IAM roles

### Step 3: Confirm Deployment

```
Continue with deployment? (yes/no) yes
```

### Step 4: Wait for Deployment

The deployment typically takes 5-10 minutes. You'll see:
```
🚀 Applying OpenTofu configuration...
aws_vpc.main: Creating...
aws_security_group.rds: Creating...
aws_db_instance.ycode: Creating...
...
✅ EC2 instances deployed!
```

### Step 5: Get EC2 Instance IP

```bash
# Get the public IP of your EC2 instance
aws ec2 describe-instances --region ap-south-1 \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text
```

### Step 6: SSH into EC2 Instance

```bash
# SSH into the instance
ssh -i your-key.pem ec2-user@<instance-ip>
# or
ssh -i your-key.pem ubuntu@<instance-ip>
```

---

## 📊 Check Deployment Status

```bash
# View OpenTofu resources and AWS instances
DEPLOY_ENV=dev make status
```

**Output includes:**
- OpenTofu state
- EC2 instances
- RDS databases
- Security groups

---

## 📝 View Logs

```bash
# View application logs on EC2
DEPLOY_ENV=dev make logs
```

**Instructions will show:**
1. How to get EC2 instance IP
2. How to SSH into the instance
3. How to view Docker Compose logs

---

## 🛑 Stop Deployment

```bash
# Stop and terminate EC2 instances
DEPLOY_ENV=dev make stop
```

**Warning:** This will terminate all EC2 instances and RDS databases.

---

## 🧹 Clean Up

```bash
# Destroy all AWS resources
DEPLOY_ENV=dev make clean
```

**Warning:** This will:
- Terminate EC2 instances
- Delete RDS databases
- Remove VPC and security groups
- Clean up OpenTofu state

---

## 📋 Deployment Configuration

### OpenTofu Variables (infra/opentofu/dev.tfvars)

```hcl
# AWS Configuration
aws_region = "ap-south-1"
environment = "dev"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]

# EC2 Configuration
instance_type = "t3.micro"
instance_count = 1
key_pair_name = "ycode-dev"

# RDS Configuration
ycode_db_instance_class = "db.t3.micro"
ycode_db_allocated_storage = 5
ycampus_db_instance_class = "db.t3.micro"
ycampus_db_allocated_storage = 5
```

### Environment Files

After deployment, configure environment files on EC2:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@<instance-ip>

# Clone repository
git clone https://github.com/your-org/yuvro-code.git
cd yuvro-code

# Configure environment
cp ycode-backend-api/.env.example ycode-backend-api/.env.dev
cp ycampus-backend-api/.env.example ycampus-backend-api/.env.dev

# Edit with RDS endpoints
nano ycode-backend-api/.env.dev
```

---

## 🔄 Common Workflows

### Deploy and Check Status

```bash
# Deploy
DEPLOY_ENV=dev make install

# Check status
DEPLOY_ENV=dev make status

# Get instance IP
aws ec2 describe-instances --region ap-south-1 \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text
```

### Deploy and SSH

```bash
# Deploy
DEPLOY_ENV=dev make install

# Get instance IP
IP=$(aws ec2 describe-instances --region ap-south-1 \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text)

# SSH into instance
ssh -i your-key.pem ec2-user@$IP
```

### Deploy, SSH, and Deploy Applications

```bash
# Deploy infrastructure
DEPLOY_ENV=dev make install

# Get instance IP
IP=$(aws ec2 describe-instances --region ap-south-1 \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text)

# SSH into instance
ssh -i your-key.pem ec2-user@$IP

# On EC2 instance:
git clone https://github.com/your-org/yuvro-code.git
cd yuvro-code
DEPLOY_ENV=dev make install
```

---

## 🛠️ Troubleshooting

### Error: "OpenTofu is not installed"

```bash
# Install OpenTofu
brew install opentofu

# Verify
tofu version
```

### Error: "AWS credentials are not configured"

```bash
# Configure AWS
aws configure

# Verify
aws sts get-caller-identity
```

### Error: "Values file not found: infra/opentofu/dev.tfvars"

```bash
# Check file exists
ls -la infra/opentofu/dev.tfvars

# If missing, copy from example
cp infra/opentofu/dev.tfvars.example infra/opentofu/dev.tfvars
```

### Error: "Plan file not found"

```bash
# This happens if you cancel the deployment
# Just run again
DEPLOY_ENV=dev make install
```

### EC2 Instance Not Accessible

```bash
# Check security group allows SSH
aws ec2 describe-security-groups --region ap-south-1 \
  --query 'SecurityGroups[?Tags[?Key==`Environment` && Value==`dev`]]'

# Add your IP to security group
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 22 \
  --cidr <your-ip>/32 \
  --region ap-south-1
```

### RDS Not Accessible from EC2

```bash
# Check RDS security group
aws rds describe-db-instances --region ap-south-1 \
  --query 'DBInstances[?Tags[?Key==`Environment` && Value==`dev`]]'

# Verify EC2 security group is in RDS security group rules
aws ec2 describe-security-groups --region ap-south-1 \
  --query 'SecurityGroups[?Tags[?Key==`Environment` && Value==`dev`]]'
```

---

## 📊 Cost Estimation

**Monthly estimated cost: ~$15-25**

| Resource | Cost |
|----------|------|
| EC2 t3.micro | ~$5-10 |
| RDS YCode (db.t3.micro, 5GB) | ~$4 |
| RDS YCampus (db.t3.micro, 5GB) | ~$4 |
| Data Transfer | ~$1-2 |
| **Total** | **~$15-25** |

---

## 🔐 Security Notes

⚠️ **Development Environment:**
- Default password: `ChangeMe123!DevPassword`
- Encryption disabled for cost
- No backups configured
- Public subnets only

**For Production:**
- Change database passwords
- Enable encryption
- Configure backups
- Use private subnets
- Enable security best practices

---

## 📚 Related Documentation

- `DEPLOYMENT_MODEL_FINAL.md` - Deployment model overview
- `DEPLOYMENT_FINAL_SUMMARY.md` - Quick reference
- `SETUP_AND_START.md` - Local development setup
- `DEPLOY_COMMANDS.md` - All available commands

---

## ✨ Quick Commands

```bash
# Deploy to AWS EC2
DEPLOY_ENV=dev make install

# Check status
DEPLOY_ENV=dev make status

# View logs
DEPLOY_ENV=dev make logs

# Stop deployment
DEPLOY_ENV=dev make stop

# Clean up
DEPLOY_ENV=dev make clean

# Get instance IP
aws ec2 describe-instances --region ap-south-1 \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text

# SSH into instance
ssh -i your-key.pem ec2-user@<instance-ip>
```

---

## 🚀 Ready to Deploy?

```bash
# Deploy to AWS EC2
DEPLOY_ENV=dev make install

# Follow the prompts and wait for deployment to complete
```

Happy deploying! 🎉
