# Quick Start: Release and Deploy to Production

## 5-Minute Setup

### Step 1: Configure GitHub Secrets (One-time)

Go to Settings → Secrets and variables → Actions → New repository secret

**Add these secrets:**
```
PROD_AWS_ACCESS_KEY_ID         = (from AWS IAM)
PROD_AWS_SECRET_ACCESS_KEY     = (from AWS IAM)
PROD_RDS_PASSWORD              = ChangeMe123!ProdPassword
DEPLOY_AWS_ACCESS_KEY_ID       = (from AWS IAM)
DEPLOY_AWS_SECRET_ACCESS_KEY   = (from AWS IAM)
DEPLOY_EC2_SSH_PRIVATE_KEY     = (private key content)
```

### Step 2: Create Production Environment (One-time)

Go to Settings → Environments → New environment

**Name:** `production`

**Protection rules:**
- ✅ Require approval from maintainers
- ✅ Allow only main branch

---

## Create a Release

### Via GitHub UI (Easiest)

1. Go to **Actions** tab
2. Click **"Create Release and Deploy to Production"**
3. Click **"Run workflow"**
4. Fill in the form:

```
Release type:      minor  (or patch, major)
Custom version:    (leave blank)
Release apps:      all    (or ycode, ycampus, etc.)
Deploy to prod:    false  (creates release only, deploy later)
```

5. Click **"Run workflow"**

### What happens automatically:
- ✅ New semantic version tag created
- ✅ GitHub Release created with deployment guide
- ✅ Docker images built (if configured)
- ✅ Release notes generated

---

## Deploy a Release to Production

### Via GitHub UI

1. Go to **Actions** tab
2. Click **"Deploy Production Release"**
3. Click **"Run workflow"**
4. Fill in the form:

```
Release tag:       v1.2.3    (from the release you created)
Deploy apps:       all       (or specific apps)
Dry run:           false     (true to preview only)
Require approval:  true      (wait for human approval)
```

5. Click **"Run workflow"**

### Approval Step

If `require_approval` is true:
1. Go to **Actions** → Find your workflow run
2. Click the workflow run
3. You'll see **"Review pending"** at the bottom
4. Click **"Review pending"** → **"Approve"**
5. Deployment starts automatically

### What happens:
- ✅ Pre-deployment health checks run
- ✅ Helm updates production deployments
- ✅ Kubernetes performs rolling update
- ✅ Smoke tests verify functionality
- ✅ Deployment record created

---

## Monitor Deployment

### In GitHub UI

1. **During deployment:**
   - Go to **Actions** tab
   - Click the running workflow
   - Watch logs in real-time

2. **After deployment:**
   - Logs show ✅ or ❌ status
   - Scroll down for summary

### In Production Cluster

```bash
# Watch pods deploying
kubectl get pods -n yuvro-production -w

# View deployment status
kubectl get deployments -n yuvro-production

# View logs of a specific app
kubectl logs -n yuvro-production -f deployment/ycode-backend

# Check overall health
bash infra/scripts/utils/verify-prod-deployment.sh
```

---

## Troubleshooting

### Deployment Failed?

**1. Check logs in GitHub:**
- Actions → Failed workflow → View logs

**2. Check cluster health:**
```bash
aws eks update-kubeconfig --name yuvro-prod-cluster --region ap-south-1
kubectl get pods -n yuvro-production
kubectl describe pod -n yuvro-production <failing-pod-name>
```

**3. Rollback if needed:**
```bash
helm rollback yuvro -n yuvro-production
```

### Release Tag Not Found?

Make sure you used the exact tag from the release:
```
Correct:  v1.2.3
Wrong:    1.2.3 (missing 'v')
Wrong:    main
```

### Secrets Not Working?

Verify all secrets are configured:
```bash
# In GitHub Settings → Secrets and variables → Actions
# All PROD_* secrets should be listed
```

---

## Common Tasks

### Deploy Only YCode (Not All Apps)

```
Release tag:       v1.2.3
Deploy apps:       ycode     ← Select just one app
Dry run:           false
Require approval:  true
```

### Test Deployment First (Dry Run)

```
Release tag:       v1.2.3
Deploy apps:       all
Dry run:           true      ← Shows what would happen
Require approval:  false     ← Skip approval for dry run
```

Then run again with:
```
Release tag:       v1.2.3
Deploy apps:       all
Dry run:           false     ← Actually deploy
Require approval:  true      ← Wait for approval
```

### Bypass Approval for Emergency

```
Release tag:       v1.2.3
Deploy apps:       all
Dry run:           false
Require approval:  false     ← Skip approval gate
```

⚠️ **Use with caution - approval is recommended!**

---

## Release Naming Convention

### Semantic Versioning

- **Patch** (v1.0.1) - Bug fixes, minor changes
- **Minor** (v1.1.0) - New features, backward compatible
- **Major** (v2.0.0) - Breaking changes, new APIs

### Examples

```
v0.1.0  → Initial version
v0.2.0  → Added new features (minor bump)
v0.2.1  → Fixed bug (patch bump)
v1.0.0  → Production ready (major bump)
v1.1.0  → More features (minor bump)
v2.0.0  → Breaking changes (major bump)
```

---

## Reference

### GitHub Actions Workflows

| Workflow | Purpose | Inputs |
|----------|---------|--------|
| `release-and-deploy.yml` | Create release + optional deploy | release_type, apps, deploy_to_prod |
| `deploy-prod-release.yml` | Deploy existing release | release_tag, apps, dry_run, approval |
| `ci.yml` | Deploy to dev from branch | branch, app |

### Quick Commands

```bash
# Verify production is healthy
bash infra/scripts/utils/verify-prod-deployment.sh

# Check what's deployed
kubectl get deployments -n yuvro-production
kubectl get pods -n yuvro-production

# View real-time logs
kubectl logs -n yuvro-production -f deployment/<app>-backend

# Rollback last deployment
helm rollback yuvro -n yuvro-production

# Check release history
helm history yuvro -n yuvro-production
```

---

## Still Need Help?

1. **Setup issues:** See `.github/GITHUB_ACTIONS_SETUP.md`
2. **Deployment guide:** See `infra/PROD_DEPLOYMENT_GUIDE.md`
3. **Infrastructure overview:** See `INFRASTRUCTURE_SUMMARY.md`
4. **Helm values:** See `helm/yuvro-production/values.yaml`

---

**Last Updated:** October 7, 2026  
**Status:** Ready for production use ✅
