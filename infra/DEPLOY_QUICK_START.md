# Quick Start: Deploy YCode to AWS Dev Environment (Minimal)

## TL;DR - 5 Minute Setup

### Prerequisites (one-time setup)
```bash
# Install tools
brew install opentofu awscli kubectl helm

# Configure AWS
aws configure
# Enter your AWS Access Key ID and Secret Access Key

# Create EC2 key pair
aws ec2 create-key-pair --key-name ycode-dev --query 'KeyMaterial' --output text > ~/.ssh/ycode-dev.pem
chmod 400 ~/.ssh/ycode-dev.pem
```

### Deploy (automated)
```bash
# Full deployment in one command
bash infra/scripts/deploy-dev-aws.sh full

# This will:
# 1. Check prerequisites
# 2. Initialize OpenTofu
# 3. Plan the deployment
# 4. Create AWS resources (1x t3.micro EC2, 2x db.t3.micro RDS, public subnets)
# 5. Setup kubeconfig
# 6. Deploy applications to Kubernetes
```

### Access Applications
```bash
# Setup port forwarding
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make port-forward

# In another terminal, access:
# - YCode Frontend: http://localhost:3000
# - YCode Backend: http://localhost:8001
# - YCampus Frontend: http://localhost:3002
# - YCampus Backend: http://localhost:8003
```

## Minimal Configuration Details

**What you get:**
- Single t3.micro EC2 instance (1 vCPU, 1GB RAM)
- Single AZ deployment (us-east-1a)
- Public subnets only (no NAT gateways)
- 2x db.t3.micro RDS instances (10GB each)
- Estimated cost: **~$35-40/month**

**Limitations:**
- Single node (no high availability)
- Limited compute resources (t3.micro)
- Single AZ (no disaster recovery)
- Public IP exposure (for cost savings)

**When to upgrade:**
- If you need HA: Add more instances and private subnets
- If you need more compute: Change instance_type to t3.small or larger
- If you need backups: Increase backup_retention_days

## Common Commands

```bash
# Check deployment status
bash infra/scripts/deploy-dev-aws.sh status

# View deployment outputs (IPs, endpoints, etc.)
bash infra/scripts/deploy-dev-aws.sh outputs

# View application logs
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make logs

# Destroy everything (cleanup)
bash infra/scripts/deploy-dev-aws.sh destroy
```

## Troubleshooting

### "OpenTofu not found"
```bash
brew install opentofu
```

### "AWS credentials not configured"
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

### "Key pair not found"
```bash
aws ec2 create-key-pair --key-name ycode-dev --query 'KeyMaterial' --output text > ~/.ssh/ycode-dev.pem
chmod 400 ~/.ssh/ycode-dev.pem
```

### "kubectl can't connect to cluster"
```bash
# Re-setup kubeconfig
bash infra/scripts/deploy-dev-aws.sh kubeconfig

# Verify connection
kubectl cluster-info
```

### "Pods not starting"
```bash
# Check pod status
kubectl get pods -A

# View pod logs
kubectl logs <pod-name> -n <namespace>

# Describe pod for events
kubectl describe pod <pod-name> -n <namespace>
```

## Cost Estimation

**Monthly cost for dev environment:**
- 2x t3.small EC2 instances: ~$30
- 2x db.t3.micro RDS databases: ~$30
- Data transfer & storage: ~$12
- **Total: ~$72/month**

## Next Steps

1. **Configure CI/CD**: Setup GitHub Actions for auto-deployment
2. **Setup Monitoring**: Configure CloudWatch dashboards
3. **Enable Logging**: Setup centralized logging
4. **Security**: Configure WAF and VPC Flow Logs

## Full Documentation

See `infra/DEPLOY_DEV_AWS.md` for detailed documentation.

## Support

- [OpenTofu Docs](https://opentofu.org/docs/)
- [AWS Docs](https://docs.aws.amazon.com/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
