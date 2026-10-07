# GitHub Actions Setup for CI/CD

This guide covers setting up GitHub Actions secrets and environments for automated deployment.

## Required Secrets

Add these secrets in GitHub Settings → Secrets and variables → Actions:

### Development Deployment Secrets
- `DEPLOY_AWS_ACCESS_KEY_ID` - AWS IAM access key for dev deployments
- `DEPLOY_AWS_SECRET_ACCESS_KEY` - AWS IAM secret key for dev deployments
- `DEPLOY_EC2_SSH_PRIVATE_KEY` - Private SSH key for EC2 instances (dev)

### Production Deployment Secrets
- `PROD_AWS_ACCESS_KEY_ID` - AWS IAM access key for prod deployments
- `PROD_AWS_SECRET_ACCESS_KEY` - AWS IAM secret key for prod deployments
- `PROD_RDS_PASSWORD` - Production RDS master password
- `DOCKER_USERNAME` - Docker Hub username (optional, for image registry)
- `DOCKER_PASSWORD` - Docker Hub password (optional, for image registry)

### GitHub Token
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions (no configuration needed)

## Environment Setup

### Create Production Environment

1. Go to Settings → Environments
2. Click "New environment" → Name it `production`
3. Add protection rules:
   - Require approval from specific people (recommended)
   - Restrict to specific branches (e.g., `main`)
4. Add environment secrets (override global secrets if needed):
   - `PROD_AWS_ACCESS_KEY_ID`
   - `PROD_AWS_SECRET_ACCESS_KEY`
   - `PROD_RDS_PASSWORD`

## Workflows

### 1. Create Release and Deploy

**File:** `.github/workflows/release-and-deploy.yml`

**Usage:**
```bash
# Via GitHub UI: Actions → Create Release and Deploy to Production → Run workflow

# Parameters:
- release_type: patch, minor, major, or custom
- custom_version: For custom type (e.g., 1.2.3)
- release_apps: Which apps to include (all, ycode, ycampus, etc.)
- deploy_to_prod: Whether to deploy immediately after release
```

**What it does:**
1. Creates a new semantic version tag
2. Creates a GitHub Release with deployment guide
3. Builds Docker images for all apps
4. Optionally deploys to production

**Example:**
```
Release type: minor
Custom version: (leave blank)
Release apps: all
Deploy to prod: false  # Create release only, deploy manually later
```

### 2. Deploy Production Release

**File:** `.github/workflows/deploy-prod-release.yml`

**Usage:**
```bash
# Via GitHub UI: Actions → Deploy Production Release → Run workflow

# Parameters:
- release_tag: Release to deploy (e.g., v1.2.3)
- deploy_apps: Which apps to deploy
- dry_run: Whether to do a dry run first
- require_approval: Whether to wait for manual approval
```

**What it does:**
1. Validates the release tag exists
2. Waits for approval (if enabled)
3. Performs pre-deployment checks
4. Deploys via Helm to Kubernetes
5. Runs smoke tests
6. Creates deployment record

**Example - Dry Run First:**
```
Release tag: v1.2.3
Deploy apps: all
Dry run: true
Require approval: false

# Run again with:
Release tag: v1.2.3
Deploy apps: all
Dry run: false
Require approval: true  # Wait for approval
```

### 3. Deploy to Dev (Existing)

**File:** `.github/workflows/ci.yml`

**Usage:**
```bash
# Via GitHub UI: Actions → Deploy to EC2 Dev → Run workflow

# Parameters:
- deploy_branch: Branch to deploy (e.g., main, develop)
- deploy_app: Which app to deploy (all, ycode, ycampus, etc.)
```

## Typical Workflow

### Development Cycle
1. Create features on development branches
2. Commit to `develop` branch
3. Run `ci.yml` to deploy to dev environment
4. Test and verify in dev

### Release Cycle
1. Merge `develop` to `main`
2. Run `release-and-deploy.yml` with:
   - `release_type: patch/minor/major`
   - `release_apps: all` (or specific apps)
   - `deploy_to_prod: false` (create release only)
3. Review release notes on GitHub
4. Run `deploy-prod-release.yml` with:
   - `release_tag: v1.2.3` (from the release you created)
   - `deploy_apps: all`
   - `dry_run: true` (optional first run)
   - `require_approval: true`
5. Approve deployment when prompted
6. Monitor deployment via Actions logs

## Security Best Practices

1. **Separate AWS credentials:** Use different IAM users/roles for dev and prod
2. **Minimal permissions:** Grant least privilege IAM policies
3. **Environment protection:** Require manual approval for production
4. **Branch protection:** Protect `main` branch from direct pushes
5. **Audit logs:** Review GitHub Actions audit logs regularly
6. **Rotate secrets:** Update AWS credentials periodically
7. **Sensitive output:** Never log passwords or keys

## Troubleshooting

### Authentication Failures
```
Error: Unable to authenticate AWS request
→ Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
→ Verify IAM user has required permissions
```

### EKS Cluster Access
```
Error: Unable to connect to cluster
→ Verify cluster name: yuvro-prod-cluster
→ Check AWS region: ap-south-1
→ Verify IAM role has EKS permissions
```

### Helm Deployment Failures
```
Error: Release name already exists
→ Check if previous deployment is still running
→ View Helm releases: helm list -n yuvro-production
→ Rollback if needed: helm rollback yuvro -n yuvro-production
```

### Docker Image Issues
```
Error: Image not found or pull rate limit
→ Ensure Docker Hub credentials are configured
→ Check image tag format: yuvro/<app>:v1.0.0
→ Verify image was built and pushed
```

## Monitoring and Alerts

### Real-time Monitoring
- Actions page shows workflow run status
- Logs available in workflow details
- Deployment status visible in Environments

### Post-Deployment Checks
```bash
# SSH to Kubernetes cluster
aws eks update-kubeconfig --name yuvro-prod-cluster --region ap-south-1

# Check deployment status
kubectl get deployments -n yuvro-production
kubectl get pods -n yuvro-production
kubectl logs -n yuvro-production -f deployment/ycode-backend
```

## Advanced Usage

### Custom Release Notes
Edit release on GitHub after creation to add:
- Breaking changes
- New features
- Bug fixes
- Migration instructions

### Conditional Deployments
Modify workflows to:
- Deploy only specific environments
- Skip deployments based on commit message
- Trigger on pull request labels

### Integration with Other Tools
- Slack notifications
- PagerDuty alerts
- Jira issue updates
- CloudWatch metrics

## Reference

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Helm Commands](https://helm.sh/docs/helm/helm_upgrade/)
- [Kubectl Reference](https://kubernetes.io/docs/reference/kubectl/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/)
