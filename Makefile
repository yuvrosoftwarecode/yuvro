# YC Full-Stack Application - Main Makefile
# This file provides a unified interface for managing YCode, YCampus, and Common services
# 
# Usage:
#   make <command>              - Run command on both platforms
#   make <command>-ycode        - Run command on YCode only
#   make <command>-ycampus      - Run command on YCampus only
#   make -f Makefile.ycode <command>    - Use YCode Makefile directly
#   make -f Makefile.ycampus <command>  - Use YCampus Makefile directly
#   make -f Makefile.common <command>   - Use Common Makefile directly

.PHONY: help
.PHONY: setup setup-ycode setup-ycampus setup-common
.PHONY: dev dev-ycode dev-ycampus stop stop-ycode stop-ycampus
.PHONY: logs logs-ycode logs-ycampus clean clean-ycode clean-ycampus
.PHONY: test-all format-all lint-all check-all
.PHONY: makemigrations makemigrations-ycode makemigrations-ycampus

# ============================================================================
# Help
# ============================================================================

help:
	@echo "YC Full-Stack Application Commands"
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup              Setup all platforms (YCode + YCampus + Common)"
	@echo "  make dev                Start all services"
	@echo "  make stop               Stop all services"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup              Setup all platforms"
	@echo "  make setup-ycode        Setup YCode platform only"
	@echo "  make setup-ycampus      Setup YCampus platform only"
	@echo "  make setup-common       Setup common services (code executor)"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev                Start all services"
	@echo "  make dev-ycode          Start YCode services"
	@echo "  make dev-ycampus        Start YCampus services"
	@echo "  make stop               Stop all services"
	@echo "  make stop-ycode         Stop YCode services"
	@echo "  make stop-ycampus       Stop YCampus services"
	@echo "  make logs               View all logs"
	@echo "  make logs-ycode         View YCode logs"
	@echo "  make logs-ycampus       View YCampus logs"
	@echo "  make clean              Clean all containers/volumes"
	@echo "  make clean-ycode        Clean YCode containers/volumes"
	@echo "  make clean-ycampus      Clean YCampus containers/volumes"
	@echo ""
	@echo "Platform-Specific Commands:"
	@echo "  make -f Makefile.ycode <command>     Run YCode command"
	@echo "  make -f Makefile.ycampus <command>   Run YCampus command"
	@echo "  make -f Makefile.common <command>    Run Common command"
	@echo ""
	@echo "Available platform commands: setup, dev, stop, logs, clean,"
	@echo "  db-shell, db-migrate, backend-shell, backend-test,"
	@echo "  frontend-shell, frontend-test, and more..."
	@echo ""
	@echo "Combined Operations:"
	@echo "  make test-all           Run all tests"
	@echo "  make format-all         Format all code"
	@echo "  make lint-all           Lint all code"
	@echo "  make check-all          Run all checks"
	@echo ""
	@echo "Code Executor:"
	@echo "  make executor-shell     Access code executor shell"
	@echo "  make executor-test      Test code executor"
	@echo "  make executor-logs      View code executor logs"
	@echo ""
	@echo "Examples:"
	@echo "  make setup-ycode                    # Setup YCode only"
	@echo "  make -f Makefile.ycode dev          # Start YCode"
	@echo "  make -f Makefile.ycode db-shell     # Access YCode database"
	@echo "  make -f Makefile.ycampus backend-test  # Test YCampus backend"
	@echo ""
	@echo "For detailed help on a specific platform:"
	@echo "  cat Makefile.ycode"
	@echo "  cat Makefile.ycampus"
	@echo "  cat Makefile.common"

# ============================================================================
# Setup Commands
# ============================================================================

setup: setup-common setup-ycode setup-ycampus
	@echo ""
	@echo "✅ All platforms setup complete!"
	@echo "🌐 YCode Frontend: http://localhost:3000"
	@echo "🔧 YCode Backend: http://localhost:8001"
	@echo "🌐 YCampus Frontend: http://localhost:3002"
	@echo "🔧 YCampus Backend: http://localhost:8003"
	@echo "⚙️  Code Executor: http://localhost:8002"

setup-common:
	@$(MAKE) -f Makefile.common setup

setup-ycode:
	@$(MAKE) -f Makefile.ycode setup

setup-ycampus:
	@$(MAKE) -f Makefile.ycampus setup

makemigrations: makemigrations-ycode makemigrations-ycampus
	@echo "✅ makemigrations completed for YCode and YCampus"

makemigrations-ycode:
	@$(MAKE) -f Makefile.ycode db-makemigrations

makemigrations-ycampus:
	@$(MAKE) -f Makefile.ycampus db-makemigrations

# ============================================================================
# Development Commands
# ============================================================================

dev:
	@echo "Starting all services (YCode, YCampus, Executor) in foreground..."
	docker compose -f docker-compose.common.yml -f docker-compose.yml -f docker-compose.ycampus.yml up

dev-ycode:
	@echo "Starting common services..."
	@docker compose -f docker-compose.common.yml up -d
	@$(MAKE) -f Makefile.ycode dev

dev-ycampus:
	@echo "Starting common services..."
	@docker compose -f docker-compose.common.yml up -d
	@$(MAKE) -f Makefile.ycampus dev

stop:
	@echo "Stopping all services..."
	@docker compose down
	@docker compose -f docker-compose.ycampus.yml down
	@docker compose -f docker-compose.common.yml down
	@echo "✅ All services stopped!"

stop-ycode:
	@$(MAKE) -f Makefile.ycode stop

stop-ycampus:
	@$(MAKE) -f Makefile.ycampus stop

logs:
	@echo "Viewing logs from all services (Ctrl+C to exit)..."
	@docker compose logs -f & \
	docker compose -f docker-compose.ycampus.yml logs -f & \
	docker compose -f docker-compose.common.yml logs -f & \
	wait

logs-ycode:
	@$(MAKE) -f Makefile.ycode logs

logs-ycampus:
	@$(MAKE) -f Makefile.ycampus logs

clean:
	@echo "🧹 Cleaning all containers and volumes..."
	@docker compose down -v --remove-orphans
	@docker compose -f docker-compose.ycampus.yml down -v --remove-orphans
	@docker compose -f docker-compose.common.yml down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Cleanup complete!"

clean-ycode:
	@$(MAKE) -f Makefile.ycode clean

clean-ycampus:
	@$(MAKE) -f Makefile.ycampus clean

# ============================================================================
# Code Executor Commands
# ============================================================================

executor-shell:
	@$(MAKE) -f Makefile.common executor-shell

executor-test:
	@$(MAKE) -f Makefile.common executor-test

executor-logs:
	@$(MAKE) -f Makefile.common executor-logs

# ============================================================================
# Combined Operations
# ============================================================================

test-all:
	@echo "Running all tests..."
	@echo "Testing YCode backend..."
	@$(MAKE) -f Makefile.ycode backend-test
	@echo "Testing YCode frontend..."
	@$(MAKE) -f Makefile.ycode frontend-test
	@echo "Testing YCampus backend..."
	@$(MAKE) -f Makefile.ycampus backend-test
	@echo "Testing YCampus frontend..."
	@$(MAKE) -f Makefile.ycampus frontend-test
	@echo "Testing code executor..."
	@$(MAKE) -f Makefile.common executor-test
	@echo "✅ All tests complete!"

format-all:
	@echo "Formatting all code..."
	@$(MAKE) -f Makefile.ycode backend-format-fix
	@$(MAKE) -f Makefile.ycode frontend-format-fix
	@$(MAKE) -f Makefile.ycampus backend-format-fix
	@$(MAKE) -f Makefile.ycampus frontend-format-fix
	@echo "✅ All code formatted!"

lint-all:
	@echo "Linting all code..."
	@$(MAKE) -f Makefile.ycode backend-lint
	@$(MAKE) -f Makefile.ycode frontend-lint
	@$(MAKE) -f Makefile.ycampus backend-lint
	@$(MAKE) -f Makefile.ycampus frontend-lint
	@echo "✅ All code linted!"

check-all:
	@echo "Running all checks..."
	@$(MAKE) format-all
	@$(MAKE) lint-all
	@$(MAKE) test-all
	@echo "✅ All checks complete!"

# ============================================================================
# Observability
# ============================================================================

observability-dev:
	@echo "🔍 Starting all services with observability..."
	docker compose -f docker-compose.common.yml -f docker-compose.yml -f docker-compose.ycampus.yml -f docker-compose.observability.yml up

observability-stop:
	docker compose -f docker-compose.observability.yml down

observability-clean:
	docker compose -f docker-compose.observability.yml down -v

observability-dashboards:
	@echo "🌐 Observability Dashboards:"
	@echo "Grafana: http://localhost:3001 (admin/admin)"
	@echo "Jaeger: http://localhost:16686"
	@echo "Prometheus: http://localhost:9090"
	@echo "Loki: http://localhost:3100"

# ============================================================================
# Production
# ============================================================================

prod-build:
	docker compose -f docker-compose.prod.yml build
	docker compose -f docker-compose.ycampus.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d
	docker compose -f docker-compose.ycampus.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down
	docker compose -f docker-compose.ycampus.prod.yml down
