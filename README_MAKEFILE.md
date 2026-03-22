# Makefile Structure Documentation

## Overview

The project uses a modular Makefile structure with separate files for each platform and common services.

## File Structure

```
Makefile              # Main file - unified interface for all platforms
Makefile.ycode        # YCode platform commands
Makefile.ycampus      # YCampus platform commands
Makefile.common       # Common services (code executor)
```

## Usage Patterns

### 1. Using Main Makefile (Recommended for most tasks)

```bash
# Setup
make setup                    # Setup all platforms
make setup-ycode              # Setup YCode only
make setup-ycampus            # Setup YCampus only

# Development
make dev                      # Start all services
make dev-ycode                # Start YCode only
make dev-ycampus              # Start YCampus only
make stop                     # Stop all services
make logs                     # View all logs
make clean                    # Clean all containers

# Combined operations
make test-all                 # Test everything
make format-all               # Format all code
make lint-all                 # Lint all code
```

### 2. Using Platform-Specific Makefiles

For platform-specific operations, use the dedicated Makefiles:

```bash
# YCode operations
make -f Makefile.ycode dev
make -f Makefile.ycode db-shell
make -f Makefile.ycode backend-test
make -f Makefile.ycode frontend-lint

# YCampus operations
make -f Makefile.ycampus dev
make -f Makefile.ycampus db-migrate
make -f Makefile.ycampus backend-shell
make -f Makefile.ycampus frontend-test

# Common services
make -f Makefile.common executor-shell
make -f Makefile.common executor-test
```

## Command Reference

### Makefile (Main)

| Command | Description |
|---------|-------------|
| `make setup` | Setup all platforms |
| `make setup-ycode` | Setup YCode only |
| `make setup-ycampus` | Setup YCampus only |
| `make setup-common` | Setup common services |
| `make dev` | Start all services |
| `make dev-ycode` | Start YCode services |
| `make dev-ycampus` | Start YCampus services |
| `make stop` | Stop all services |
| `make logs` | View all logs |
| `make clean` | Clean all containers |
| `make test-all` | Run all tests |
| `make format-all` | Format all code |
| `make lint-all` | Lint all code |

### Makefile.ycode

| Command | Description |
|---------|-------------|
| `setup` | Setup YCode platform |
| `dev` | Start YCode services |
| `stop` | Stop YCode services |
| `logs` | View YCode logs |
| `clean` | Clean YCode containers |
| `reload-data` | Reload test data |
| `db-shell` | Access database |
| `db-migrate` | Run migrations |
| `db-makemigrations` | Create migrations |
| `backend-shell` | Django shell |
| `backend-test` | Run backend tests |
| `backend-format-fix` | Format backend code |
| `backend-lint` | Lint backend code |
| `frontend-shell` | Node.js shell |
| `frontend-test` | Run frontend tests |
| `frontend-format-fix` | Format frontend code |
| `frontend-lint` | Lint frontend code |

### Makefile.ycampus

Same commands as Makefile.ycode but for YCampus platform.

### Makefile.common

| Command | Description |
|---------|-------------|
| `setup` | Setup common services |
| `dev` | Start code executor |
| `stop` | Stop code executor |
| `logs` | View executor logs |
| `clean` | Clean executor containers |
| `executor-shell` | Access executor shell |
| `executor-test` | Test executor |
| `executor-logs` | View executor logs |
