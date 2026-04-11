# Recommended: Local Docker Compose Only

For dev environment testing, use **local Docker Compose only**. No AWS infrastructure needed.

## Why Local Only?

✅ **$0/month** - No AWS costs
✅ **2 minutes setup** - Just run `make install`
✅ **Full functionality** - All services work locally
✅ **Easy cleanup** - Just run `make clean`
✅ **Perfect for testing** - Exactly what you asked for

## Quick Deploy

```bash
# Start everything
DEPLOY_ENV=dev make install

# Access at localhost
# - YCode: http://localhost:3000
# - YCampus: http://localhost:3002
```

That's it! 🚀

## What You Get

- YCode Frontend (React)
- YCode Backend (Django)
- YCampus Frontend (React)
- YCampus Backend (Django)
- Code Executor (FastAPI)
- PostgreSQL databases (local containers)

All running on your machine, no AWS needed.

## Common Tasks

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Database
docker compose exec yc-db psql -U ycode_admin -d ycode

# Migrations
DEPLOY_ENV=dev make makemigrations

# Tests
DEPLOY_ENV=dev make test-all

# Cleanup
DEPLOY_ENV=dev make clean
```

## When to Use AWS

Only use AWS RDS when you need:
- Persistent database across restarts
- Team shared database
- Production-like setup
- Automated backups

For now, local is perfect.

## Full Documentation

See `infra/DEPLOY_DEV_LOCAL_ONLY.md` for complete guide.

## Ready?

```bash
DEPLOY_ENV=dev make install
```

Done! 🎉
