# Deploy YCode Dev Environment - Local Docker Compose Only

For minimal cost testing, run everything locally with Docker Compose. No AWS infrastructure needed.

## Quick Start (2 minutes)

### Step 1: Start Docker Compose

```bash
# From project root
DEPLOY_ENV=dev make install
```

This starts:
- YCode Frontend (port 3000)
- YCode Backend (port 8001)
- YCampus Frontend (port 3002)
- YCampus Backend (port 8003)
- Code Executor (port 8002)
- PostgreSQL databases (local containers)

### Step 2: Verify Deployment

```bash
# Check containers
docker compose ps

# View logs
DEPLOY_ENV=dev make logs

# Test backend
curl http://localhost:8001/api/health
curl http://localhost:8003/api/health
```

### Step 3: Access Applications

- **YCode Frontend**: http://localhost:3000
- **YCode Backend**: http://localhost:8001
- **YCampus Frontend**: http://localhost:3002
- **YCampus Backend**: http://localhost:8003

## Cost

**$0/month** - Everything runs locally on your machine

## Common Commands

```bash
# Start
DEPLOY_ENV=dev make install

# Stop
DEPLOY_ENV=dev make stop

# Logs
DEPLOY_ENV=dev make logs

# Migrations
DEPLOY_ENV=dev make makemigrations

# Load test data
DEPLOY_ENV=dev make load-fixtures-ycode
DEPLOY_ENV=dev make load-fixtures-ycampus

# Tests
DEPLOY_ENV=dev make test-all

# Format code
DEPLOY_ENV=dev make format-all

# Lint code
DEPLOY_ENV=dev make lint-all

# Cleanup
DEPLOY_ENV=dev make clean
```

## Database Access

```bash
# Connect to YCode database
docker compose exec yc-db psql -U ycode_admin -d ycode

# Connect to YCampus database
docker compose exec ycampus-db psql -U ycampus_admin -d ycampus
```

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Docker Containers Won't Start

```bash
# Check logs
DEPLOY_ENV=dev make logs

# Rebuild containers
docker compose build --no-cache

# Start fresh
DEPLOY_ENV=dev make clean
DEPLOY_ENV=dev make install
```

### Database Connection Failed

```bash
# Check if database container is running
docker compose ps

# View database logs
docker compose logs yc-db
docker compose logs ycampus-db

# Restart database
docker compose restart yc-db ycampus-db
```

## When to Use AWS RDS

Use AWS RDS when you need:
- Persistent database across local machine restarts
- Shared database for team development
- Production-like environment
- Automated backups

For now, local Docker Compose is perfect for testing.

## Next Steps

1. Start Docker Compose: `DEPLOY_ENV=dev make install`
2. Access applications at localhost
3. Load test data: `DEPLOY_ENV=dev make load-fixtures-ycode`
4. Run tests: `DEPLOY_ENV=dev make test-all`
5. Develop and test locally

## Documentation

- **Full Guide**: `infra/DEPLOY_DEV_AWS.md`
- **Quick Start**: `infra/DEPLOY_DEV_QUICK_START.md`
- **Summary**: `infra/DEV_DEPLOYMENT_SUMMARY.md`
- **Checklist**: `infra/DEV_DEPLOYMENT_CHECKLIST.md`

## Ready?

```bash
DEPLOY_ENV=dev make install
```

That's it! 🚀
