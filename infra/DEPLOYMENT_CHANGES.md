# 📝 Deployment Strategy Changes

## What Changed

The deployment strategy has been updated to use `DEPLOY_ENV` to determine both the environment AND the deployment type.

### Before
```bash
make install                    # Local Docker Compose
DEPLOY_ENV=dev make install     # Dev Docker Compose (RDS)
DEPLOY_TYPE=k8s make install    # Kubernetes (staging/prod)
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install  # Staging Kubernetes
```

### After
```bash
make install                    # Local Docker Compose
DEPLOY_ENV=local make install   # Local Docker Compose (explicit)
DEPLOY_ENV=dev make install     # AWS EC2 with Kubernetes
DEPLOY_ENV=staging make install # Staging Kubernetes
DEPLOY_ENV=prod make install    # Production Kubernetes
```

---

## Key Changes

### 1. DEPLOY_TYPE Auto-Selection

**Old Logic:**
```makefile
DEPLOY_TYPE ?= $(if $(filter local dev,$(DEPLOY_ENV)),docker,k8s)
```
- `local` → docker
- `dev` → docker
- `staging` → k8s
- `prod` → k8s

**New Logic:**
```makefile
DEPLOY_TYPE ?= $(if $(filter local,$(DEPLOY_ENV)),docker,k8s)
```
- `local` → docker
- `dev` → k8s (AWS EC2)
- `staging` → k8s
- `prod` → k8s

### 2. Docker Compose Configuration

**Old:**
```makefile
ENV_OVERRIDE := $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml)
COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml $(ENV_OVERRIDE)
```

**New:**
```makefile
COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.local.yml
```

- Only uses `docker-compose.local.yml` for local development
- Dev environment now uses Kubernetes instead

### 3. Validation Rules

**Old:**
```makefile
if staging|prod && docker → ERROR
```

**New:**
```makefile
if local && k8s → ERROR
if dev|staging|prod && docker → ERROR
```

---

## Environment Mapping

| DEPLOY_ENV | DEPLOY_TYPE | Infrastructure | .env File | Use Case |
|-----------|-------------|-----------------|-----------|----------|
| local | docker | Local Docker Compose | .env.local | Development |
| dev | k8s | AWS EC2 Kubernetes | .env.dev | Dev/Testing |
| staging | k8s | Kubernetes Cluster | .env.staging | Pre-production |
| prod | k8s | Kubernetes Cluster | .env.prod | Production |

---

## Command Changes

### Local Development

**Before:**
```bash
make install                    # Works
DEPLOY_ENV=dev make install     # Works (Docker Compose with RDS)
```

**After:**
```bash
make install                    # Works (Docker Compose)
DEPLOY_ENV=local make install   # Works (Docker Compose, explicit)
DEPLOY_ENV=dev make install     # Now deploys to AWS EC2 with Kubernetes
```

### AWS EC2 Deployment

**Before:**
```bash
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install  # Required explicit DEPLOY_TYPE
```

**After:**
```bash
DEPLOY_ENV=dev make install     # Automatically uses Kubernetes
```

### Staging/Production

**Before:**
```bash
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make install
```

**After:**
```bash
DEPLOY_ENV=staging make install
DEPLOY_ENV=prod make install
```

---

## Migration Guide

### If You Were Using Local Development

**Before:**
```bash
make install
# or
DEPLOY_ENV=dev make install  # This was local Docker Compose with RDS
```

**After:**
```bash
make install
# or
DEPLOY_ENV=local make install
```

**Action Required:** None - `make install` still works the same way

### If You Were Using Dev with Docker Compose + RDS

**Before:**
```bash
DEPLOY_ENV=dev make install  # Local Docker Compose with RDS
```

**After:**
```bash
DEPLOY_ENV=local make install  # Use local instead
# or
make install  # Default is local
```

**Action Required:** Update scripts/documentation to use `DEPLOY_ENV=local` instead of `DEPLOY_ENV=dev`

### If You Were Using Kubernetes

**Before:**
```bash
DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install
DEPLOY_ENV=prod DEPLOY_TYPE=k8s make install
```

**After:**
```bash
DEPLOY_ENV=dev make install
DEPLOY_ENV=staging make install
DEPLOY_ENV=prod make install
```

**Action Required:** Remove `DEPLOY_TYPE=k8s` from commands

---

## Files Modified

### Makefile
- Updated `DEPLOY_TYPE` auto-selection logic
- Updated validation rules
- Updated help text
- Updated Docker Compose configuration

### Documentation Created
- `DEPLOYMENT_STRATEGY.md` - New deployment strategy guide
- `DEPLOYMENT_CHANGES.md` - This file

---

## Backward Compatibility

### Breaking Changes
- `DEPLOY_ENV=dev make install` now deploys to AWS EC2 (Kubernetes) instead of local Docker Compose
- `DEPLOY_TYPE=docker` with `DEPLOY_ENV=dev|staging|prod` is now invalid

### Non-Breaking Changes
- `make install` still works (defaults to `DEPLOY_ENV=local`)
- `DEPLOY_ENV=local make install` works (new explicit option)
- `DEPLOY_ENV=staging make install` works (no change)
- `DEPLOY_ENV=prod make install` works (no change)

---

## Benefits

1. **Simpler Commands**: No need to specify `DEPLOY_TYPE` anymore
2. **Clearer Intent**: `DEPLOY_ENV=dev` clearly means "deploy to dev environment"
3. **Consistent Naming**: Environment name matches deployment target
4. **Reduced Confusion**: No more mixing `DEPLOY_ENV` and `DEPLOY_TYPE`

---

## Troubleshooting

### Error: "Incompatible: DEPLOY_ENV=dev requires DEPLOY_TYPE=k8s"

**Cause:** You're trying to use `DEPLOY_ENV=dev` with `DEPLOY_TYPE=docker`

**Solution:** Remove `DEPLOY_TYPE=docker` from your command
```bash
# Wrong
DEPLOY_ENV=dev DEPLOY_TYPE=docker make install

# Right
DEPLOY_ENV=dev make install
```

### Error: "Incompatible: DEPLOY_ENV=local requires DEPLOY_TYPE=docker"

**Cause:** You're trying to use `DEPLOY_ENV=local` with `DEPLOY_TYPE=k8s`

**Solution:** Remove `DEPLOY_TYPE=k8s` from your command
```bash
# Wrong
DEPLOY_ENV=local DEPLOY_TYPE=k8s make install

# Right
DEPLOY_ENV=local make install
# or just
make install
```

### I want to use Docker Compose with dev environment

**Solution:** Use `DEPLOY_ENV=local` instead
```bash
# Old way (no longer works)
DEPLOY_ENV=dev make install

# New way
DEPLOY_ENV=local make install
```

---

## Next Steps

1. Update any CI/CD pipelines that use `DEPLOY_ENV=dev DEPLOY_TYPE=k8s`
2. Update documentation to reflect new commands
3. Update team scripts and automation
4. Test deployments with new commands

---

## Questions?

See `DEPLOYMENT_STRATEGY.md` for detailed information about the new deployment strategy.
