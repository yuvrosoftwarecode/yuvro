# Dev Environment Deployment Checklist

## Pre-Deployment

- [ ] AWS account created
- [ ] AWS credentials configured (`aws configure`)
- [ ] Docker Desktop installed and running
- [ ] OpenTofu installed (`brew install opentofu`)
- [ ] PostgreSQL client installed (`brew install postgresql`)
- [ ] Git repository cloned
- [ ] AWS region set to `ap-south-1`

## Infrastructure Setup (OpenTofu)

- [ ] Navigate to `infra/opentofu`
- [ ] Run `tofu init`
- [ ] Review `dev.tfvars` configuration
- [ ] Run `tofu plan -var-file=dev.tfvars -out=tfplan`
- [ ] Review plan output
- [ ] Run `tofu apply tfplan`
- [ ] Wait for RDS creation (5-10 minutes)
- [ ] Run `tofu output` and save endpoints

## Environment Configuration

### YCode Backend
- [ ] Copy `yc-backend-api/.env.example` to `yc-backend-api/.env.dev`
- [ ] Update `DB_HOST` with YCode RDS endpoint
- [ ] Update `DB_USER` to `ycode_admin`
- [ ] Update `DB_PASSWORD` with RDS password
- [ ] Set `DEBUG=True`
- [ ] Set `DEPLOY_ENV=dev`

### YCampus Backend
- [ ] Copy `ycampus-backend-api/.env.example` to `ycampus-backend-api/.env.dev`
- [ ] Update `DB_HOST` with YCampus RDS endpoint
- [ ] Update `DB_USER` to `ycampus_admin`
- [ ] Update `DB_PASSWORD` with RDS password
- [ ] Set `DEBUG=True`
- [ ] Set `DEPLOY_ENV=dev`

### YCode Frontend
- [ ] Copy `yc-web/.env.example` to `yc-web/.env.dev`
- [ ] Set `VITE_API_URL=http://localhost:8001`
- [ ] Set `VITE_DEPLOY_ENV=dev`

### YCampus Frontend
- [ ] Copy `ycampus-web/.env.example` to `ycampus-web/.env.dev`
- [ ] Set `VITE_API_URL=http://localhost:8003`
- [ ] Set `VITE_DEPLOY_ENV=dev`

### Code Executor
- [ ] Copy `yc-code-executor/.env.example` to `yc-code-executor/.env.dev`
- [ ] Set `DEBUG=True`
- [ ] Set `DEPLOY_ENV=dev`

## Docker Compose Startup

- [ ] Navigate to project root
- [ ] Run `DEPLOY_ENV=dev make install`
- [ ] Wait for all containers to start (2-3 minutes)
- [ ] Run `docker compose ps` to verify all containers running
- [ ] Run `DEPLOY_ENV=dev make logs` to check for errors

## Verification

### Database Connectivity
- [ ] Connect to YCode DB: `psql -h <endpoint> -U ycode_admin -d ycode`
- [ ] Connect to YCampus DB: `psql -h <endpoint> -U ycampus_admin -d ycampus`
- [ ] Run migrations: `DEPLOY_ENV=dev make makemigrations`

### Application Health
- [ ] YCode Backend: `curl http://localhost:8001/api/health`
- [ ] YCampus Backend: `curl http://localhost:8003/api/health`
- [ ] Code Executor: `curl http://localhost:8002/health`

### Web Access
- [ ] YCode Frontend: http://localhost:3000
- [ ] YCampus Frontend: http://localhost:3002
- [ ] Can login with test credentials

## Post-Deployment

- [ ] Load test data: `DEPLOY_ENV=dev make load-fixtures-ycode`
- [ ] Load test data: `DEPLOY_ENV=dev make load-fixtures-ycampus`
- [ ] Run tests: `DEPLOY_ENV=dev make test-all`
- [ ] Format code: `DEPLOY_ENV=dev make format-all`
- [ ] Lint code: `DEPLOY_ENV=dev make lint-all`

## Troubleshooting

### If RDS connection fails
- [ ] Verify RDS endpoint: `tofu output ycode_db_endpoint`
- [ ] Check security group allows your IP
- [ ] Verify credentials in .env files
- [ ] Check Docker network: `docker network ls`

### If containers won't start
- [ ] Check logs: `DEPLOY_ENV=dev make logs`
- [ ] Verify .env files are correct
- [ ] Check ports aren't already in use: `lsof -i :3000`
- [ ] Rebuild containers: `docker compose build --no-cache`

### If migrations fail
- [ ] Verify database connection
- [ ] Check migrations exist: `docker compose exec yc-backend-api python manage.py showmigrations`
- [ ] Run migrations manually: `docker compose exec yc-backend-api python manage.py migrate`

## Maintenance

### Daily
- [ ] Check application logs: `DEPLOY_ENV=dev make logs`
- [ ] Monitor RDS: `aws rds describe-db-instances --region ap-south-1`

### Weekly
- [ ] Run tests: `DEPLOY_ENV=dev make test-all`
- [ ] Check disk space: `docker system df`
- [ ] Review error logs

### Monthly
- [ ] Check AWS costs
- [ ] Review RDS backups
- [ ] Update dependencies

## Cleanup (When Done)

- [ ] Stop applications: `DEPLOY_ENV=dev make stop`
- [ ] Destroy RDS: `cd infra/opentofu && tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy && tofu apply tfplan_destroy`
- [ ] Remove state: `rm -rf infra/opentofu/.terraform && rm infra/opentofu/terraform.tfstate*`
- [ ] Clean Docker: `docker system prune -a`

## Quick Reference

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Database
psql -h <endpoint> -U ycode_admin -d ycode

# Migrations
DEPLOY_ENV=dev make makemigrations

# Tests
DEPLOY_ENV=dev make test-all

# Cleanup
DEPLOY_ENV=dev make clean
cd infra/opentofu
tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy
tofu apply tfplan_destroy
```

## Support

- Quick Start: `infra/DEPLOY_DEV_QUICK_START.md`
- Full Guide: `infra/DEPLOY_DEV_AWS.md`
- Summary: `infra/DEV_DEPLOYMENT_SUMMARY.md`
- Script Help: `bash infra/scripts/deploy-dev-aws.sh help`
