# GitHub Actions Setup for AWS ECR and EKS Deployment

This guide explains how to set up GitHub Actions workflows to build Docker images, create releases, and deploy to production EKS.

## Prerequisites

- AWS Account with ECR repositories created
- EKS cluster running (`yuvro-prod-cluster`)
- GitHub repository with admin access
- OpenTofu/Terraform for infrastructure management

## Setup Steps

### Step 1: Create AWS IAM Role for GitHub Actions (OIDC)

Run the following OpenTofu code to create the GitHub Actions IAM role with OIDC provider:

```bash
cd infra/opentofu/prod

# Apply the GitHub Actions OIDC configuration
tofu plan -lock=false
tofu apply -lock=false
```

This creates:
- **OIDC Provider**: `https://token.actions.githubusercontent.com`
- **IAM Role**: `github-actions-role`
- **Policies**: ECR push/pull permissions

### Step 2: Get the GitHub Actions Role ARN

```bash
cd infra/opentofu/prod

# Get the role ARN
tofu output github_actions_role_arn
```

Example output:
```
arn:aws:iam::878235034597:role/github-actions-role
```

### Step 3: Configure GitHub Repository Secrets

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions**

| Secret Name | Value |
|------------|-------|
| `AWS_ACCOUNT_ID` | `878235034597` |

### Step 4: Verify ECR Repositories

Ensure all ECR repositories exist:

```bash
aws ecr describe-repositories --region ap-south-1 | grep repositoryName
```

Expected repositories:
- `ycode-backend`
- `ycode-frontend`
- `ycampus-backend`
- `ycampus-frontend`
- `ylabs-backend`
- `ylabs-frontend`
- `yhub-backend`
- `ymarketplace-backend`
- `ymarketplace-frontend`
- `code-executor`

If any are missing, create them:
```bash
aws ecr create-repository \
  --repository-name <repo-name> \
  --region ap-south-1 \
  --encryption-configuration encryptionType=AES
```

### Step 5: Update Helm Values (Optional)

The image registry has been pre-configured to use ECR:

```yaml
# helm/yuvro-production/values-prod.yaml
imageRegistry: 878235034597.dkr.ecr.ap-south-1.amazonaws.com
```

All image references will automatically use the ECR registry.

## GitHub Workflows

### 1. Release and Build Images (`release-images.yml`)

**Purpose**: Create a GitHub release and build/push all Docker images to ECR

**Trigger**: Manual workflow dispatch

**Usage**:
```
GitHub → Actions → Release and Build Images → Run workflow
```

**Inputs**:
- **version** (required): Release version (e.g., `v1.0.0`)
- **release_notes** (optional): Release notes/changelog

**What it does**:
1. ✅ Creates a GitHub release with the specified version
2. ✅ Builds all 10 Docker images in parallel
3. ✅ Pushes images to ECR with two tags:
   - `<image>:v1.0.0` (specific version)
   - `<image>:latest` (latest tag)
4. ✅ Generates release notes with all image URIs

**Example**:
```
Version: v1.0.0
Release Notes: 
- Added new features
- Bug fixes
- Performance improvements
```

### 2. Deploy to Production (`deploy-prod.yml`)

**Purpose**: Deploy released images to production EKS cluster

**Trigger**: Manual workflow dispatch

**Inputs**:
- **release_version** (required): Version to deploy (e.g., `v1.0.0`)
- **namespace** (optional): Kubernetes namespace (default: `yuvro-prod-ns`)

**What it does**:
1. ✅ Validates inputs and checks EKS cluster access
2. ✅ Verifies all images exist in ECR
3. ✅ Creates ECR authentication secret in Kubernetes
4. ✅ Updates Helm values with specific image tags
5. ✅ Deploys/upgrades Helm release
6. ✅ Verifies deployment with rollout status
7. ✅ Generates deployment report

**Example**:
```
Release Version: v1.0.0
Namespace: yuvro-prod-ns
```

## Workflow Usage Examples

### Scenario 1: Create Release v1.0.0

1. **GitHub → Actions → Release and Build Images → Run workflow**
2. **Input**:
   - Version: `v1.0.0`
   - Release Notes: `Initial production release`
3. **Wait** for all images to build and push (~15-20 minutes)
4. **Check** GitHub releases to confirm

### Scenario 2: Deploy Release to Production

1. **GitHub → Actions → Deploy to Production → Run workflow**
2. **Input**:
   - Release Version: `v1.0.0`
   - Namespace: `yuvro-prod-ns`
3. **Wait** for deployment to complete (~5-10 minutes)
4. **Verify** pods are running:
   ```bash
   kubectl -n yuvro-prod-ns get pods
   ```

## Troubleshooting

### Images Not Pushing to ECR

**Error**: `ECR login failed` or `AccessDenied`

**Solution**:
1. Check AWS_ACCOUNT_ID secret is set correctly
2. Verify GitHub Actions role has ECR permissions:
   ```bash
   aws iam get-role-policy \
     --role-name github-actions-role \
     --policy-name github-actions-ecr-policy
   ```
3. Check OIDC provider thumbprint:
   ```bash
   aws iam list-open-id-connect-providers
   ```

### Deployment Fails to Connect to EKS

**Error**: `Unable to connect to EKS cluster`

**Solution**:
1. Verify EKS cluster is running:
   ```bash
   aws eks describe-cluster --name yuvro-prod-cluster --region ap-south-1
   ```
2. Check GitHub Actions role can assume cluster role:
   ```bash
   aws sts assume-role-with-web-identity \
     --role-arn arn:aws:iam::878235034597:role/github-actions-role \
     --role-session-name github-actions-test \
     --web-identity-token $TOKEN
   ```

### Pods Not Starting After Deployment

**Error**: `ImagePullBackOff` or `InvalidImageName`

**Solution**:
1. Check if ECR secret is created:
   ```bash
   kubectl -n yuvro-prod-ns get secret ecr-secret
   ```
2. Verify image exists in ECR:
   ```bash
   aws ecr describe-images --repository-name ycode-backend --region ap-south-1
   ```
3. Check pod events:
   ```bash
   kubectl -n yuvro-prod-ns describe pod <pod-name>
   ```

## Manual Deployment (Without GitHub Actions)

If needed, you can deploy manually:

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name yuvro-prod-cluster \
  --region ap-south-1

# Create ECR secret
aws ecr get-authorization-token --region ap-south-1 \
  --query 'authorizationData[0].authorizationToken' \
  --output text | base64 --decode

# Deploy with Helm
helm upgrade --install yuvro \
  ./helm/yuvro-production \
  --namespace yuvro-prod-ns \
  --values ./helm/yuvro-production/values-prod.yaml \
  --set global.imageTag=v1.0.0 \
  --wait
```

## Security Best Practices

1. **Restrict OIDC Role**: Limit which GitHub repos can assume the role:
   ```hcl
   StringLike = {
     "token.actions.githubusercontent.com:sub" = "repo:your-org/yuvro:*"
   }
   ```

2. **Limit ECR Permissions**: Restrict to specific repositories:
   ```hcl
   Resource = [
     "arn:aws:ecr:ap-south-1:878235034597:repository/ycode-*",
     "arn:aws:ecr:ap-south-1:878235034597:repository/ycampus-*",
     # ... etc
   ]
   ```

3. **Enable ECR Image Scanning**: Automatically scan pushed images for vulnerabilities

4. **Use Signed Image Tags**: Implement Docker Content Trust (DCT)

5. **Rotate Credentials**: AWS temporary credentials rotate automatically via OIDC

## CI/CD Pipeline Summary

```
main branch
    ↓
[Release Workflow]
    ├─ Create GitHub release (v1.0.0)
    ├─ Build 10 Docker images in parallel
    ├─ Push to ECR with version tags
    └─ Update release notes with image URIs
    ↓
[Deploy Workflow] (manual trigger)
    ├─ Verify images in ECR
    ├─ Create EKS authentication secret
    ├─ Update Helm values with specific tags
    ├─ Deploy to EKS cluster
    └─ Verify rollout status
    ↓
Production Environment
    └─ Pods running with new images
```

## Next Steps

1. ✅ Set up AWS IAM role and OIDC provider
2. ✅ Configure GitHub repository secrets
3. ✅ Create a test release (e.g., `v0.1.0`)
4. ✅ Deploy test release to production
5. ✅ Verify pods are running correctly
6. ✅ Monitor logs and metrics

## Support

For issues or questions:
1. Check GitHub Actions logs: **Actions → Workflow run → Logs**
2. Check EKS cluster status: `kubectl cluster-info`
3. Review Helm deployment: `helm status yuvro -n yuvro-prod-ns`
4. Check CloudWatch logs: `aws logs tail /aws/eks/...`
