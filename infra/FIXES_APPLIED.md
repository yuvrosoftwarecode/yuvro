# OpenTofu Configuration Fixes Applied

## Issues Fixed

### 1. RDS Module Errors
**File**: `infra/opentofu/modules/rds/main.tf`

**Issues**:
- `enable_cloudwatch_logs_exports` → Changed to `enabled_cloudwatch_logs_exports`
- `enable_iam_database_authentication` → Removed (not supported in current AWS provider)
- `aws_db_instance_parameter_group_association` → Removed (not a valid resource type)

**Solution**:
- Updated attribute names to match AWS provider v5.0
- Moved parameter group association to `parameter_group_name` directly in `aws_db_instance`
- Made CloudWatch logs conditional based on backup retention days
- Added proper lifecycle management for parameter groups

### 2. S3 Module Lifecycle Configuration Errors
**File**: `infra/opentofu/modules/s3/main.tf`

**Issues**:
- S3 lifecycle rules missing required `filter` block
- Error: "No attribute specified when one (and only one) of [rule[0].filter, rule[0].prefix] is required"

**Solution**:
- Added empty `filter {}` block to both lifecycle configurations
- This satisfies the AWS provider requirement for lifecycle rules

### 3. Variables Validation Errors
**File**: `infra/opentofu/variables.tf`

**Issues**:
- `environment` validation only allowed "staging" and "prod", not "dev"
- `instance_count` validation required minimum 1, but dev uses 0 (Docker Compose only)
- `backup_retention_days` validation required minimum 1, but dev uses 0 (no backups for testing)

**Solution**:
- Updated `environment` validation to include "dev"
- Updated `instance_count` validation to allow 0 (for Docker Compose deployments)
- Updated `backup_retention_days` validation to allow 0 (for minimal testing setups)
- Updated descriptions to clarify usage

## Files Modified

1. `infra/opentofu/modules/rds/main.tf`
   - Fixed attribute names
   - Removed unsupported resource
   - Added parameter group association directly

2. `infra/opentofu/modules/s3/main.tf`
   - Added `filter {}` to lifecycle rules

3. `infra/opentofu/variables.tf`
   - Updated validation rules
   - Updated descriptions

## Testing

```bash
cd infra/opentofu
tofu plan -var-file=dev.tfvars -out=tfplan
```

**Result**: ✅ Plan: 58 to add, 0 to change, 0 to destroy

## Deployment

Now you can deploy:

```bash
# Apply the plan
tofu apply tfplan

# Get outputs
tofu output
```

## Configuration Summary

**Dev Environment (dev.tfvars)**:
- Region: ap-south-1 (India)
- Single AZ: ap-south-1a
- Public subnets only (no NAT gateways)
- RDS: db.t3.micro (2GB storage, 5GB max)
- Backups: 0 days (no backups for testing)
- EC2: instance_count = 0 (Docker Compose runs locally)
- Estimated cost: ~$11-12/month

## Next Steps

1. Deploy RDS: `tofu apply tfplan`
2. Get endpoints: `tofu output`
3. Configure .env files with RDS endpoints
4. Start Docker Compose: `DEPLOY_ENV=dev make install`
5. Access applications at localhost
