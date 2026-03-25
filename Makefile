# YC Full-Stack Application - Main Makefile
# This file provides a unified interface for managing YCode, YCampus, and Common services
#
# Usage:
#   make install                        - Run with defaults (DEPLOY_ENV=local, DEPLOY_TYPE=docker)
#   DEPLOY_ENV=dev make install         - Run in dev environment
#   DEPLOY_TYPE=k8s make install        - Use Kubernetes

.PHONY: help install run stop clean logs status port-forward
.PHONY: install-ycode install-ycampus run-ycode run-ycampus
.PHONY: stop-ycode stop-ycampus clean-ycode clean-ycampus
.PHONY: logs-ycode logs-ycampus load-fixtures-ycode load-fixtures-ycampus
.PHONY: test-all format-all lint-all check-all
.PHONY: makemigrations makemigrations-ycode makemigrations-ycampus
.PHONY: observability-dev observability-stop observability-clean observability-dashboards
.PHONY: prod-build prod-up prod-down
.PHONY: _validate-deploy

# ============================================================================
# Environment Configuration
# ============================================================================

DEPLOY_ENV  ?= local
DEPLOY_TYPE ?= $(if $(filter local dev,$(DEPLOY_ENV)),docker,k8s)

# Validate DEPLOY_ENV
VALID_DEPLOY_ENVS  := local dev staging prod
VALID_DEPLOY_TYPES := docker k8s

_validate-deploy:
	@if ! echo "$(VALID_DEPLOY_ENVS)" | grep -qw "$(DEPLOY_ENV)"; then \
		echo "❌ Invalid DEPLOY_ENV='$(DEPLOY_ENV)'. Must be one of: $(VALID_DEPLOY_ENVS)"; \
		exit 1; \
	fi
	@if ! echo "$(VALID_DEPLOY_TYPES)" | grep -qw "$(DEPLOY_TYPE)"; then \
		echo "❌ Invalid DEPLOY_TYPE='$(DEPLOY_TYPE)'. Must be one of: $(VALID_DEPLOY_TYPES)"; \
		exit 1; \
	fi
	@if [ "$(filter staging prod,$(DEPLOY_ENV))" != "" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "❌ Incompatible: DEPLOY_ENV=$(DEPLOY_ENV) requires DEPLOY_TYPE=k8s"; \
		exit 1; \
	fi
	@echo "▶ DEPLOY_ENV=$(DEPLOY_ENV)  DEPLOY_TYPE=$(DEPLOY_TYPE)"

help:
	@echo "Usage: [DEPLOY_ENV=local|dev|staging|prod] [DEPLOY_TYPE=docker|k8s] make <command>"
	@echo ""
	@echo "Environment:"
	@echo "  DEPLOY_ENV    local (default) | dev | staging | prod"
	@echo "  DEPLOY_TYPE   docker (default for local/dev) | k8s (default for staging/prod)"
	@echo ""
	@echo "Main Commands:"
	@echo "  make install            Install/start all services"
	@echo "  make run                Start all services (alias for install)"
	@echo "  make stop               Stop all services"
	@echo "  make clean              Clean all containers/volumes"
	@echo "  make logs               View all logs"
	@echo "  make status             Check deployment status"
	@echo "  make port-forward       Setup port forwarding (k8s only)"
	@echo ""
	@echo "Platform-Specific Commands:"
	@echo "  make install-ycode      Start YCode services only"
	@echo "  make install-ycampus    Start YCampus services only"
	@echo "  make run-ycode          Start YCode services (alias for install-ycode)"
	@echo "  make run-ycampus        Start YCampus services (alias for install-ycampus)"
	@echo "  make stop-ycode         Stop YCode services"
	@echo "  make stop-ycampus       Stop YCampus services"
	@echo "  make clean-ycode        Clean YCode containers/volumes"
	@echo "  make clean-ycampus      Clean YCampus containers/volumes"
	@echo "  make logs-ycode         View YCode logs"
	@echo "  make logs-ycampus       View YCampus logs"
	@echo "  make load-fixtures-ycode    Load YCode test data"
	@echo "  make load-fixtures-ycampus  Load YCampus test data"
	@echo ""
	@echo "Examples:"
	@echo "  make install                        # Start all (local + docker)"
	@echo "  DEPLOY_ENV=dev make install         # Start all (dev + docker)"
	@echo "  make install-ycode                  # Start YCode only"
	@echo "  DEPLOY_TYPE=k8s make install        # Deploy to Kubernetes"
	@echo "  DEPLOY_ENV=staging DEPLOY_TYPE=k8s make install  # Deploy to staging k8s"

# ============================================================================
# Docker Compose Commands (DEPLOY_TYPE=docker)
# ============================================================================

ifeq ($(DEPLOY_TYPE),docker)
  ENV_OVERRIDE := $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml)
  COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml $(ENV_OVERRIDE)
endif

install run: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting all services [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		docker compose $(COMPOSE_FILES) up; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🚀 Deploying to Kubernetes [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		if [ ! -f "helm/values-$(DEPLOY_ENV).yaml" ]; then \
			echo "❌ Values file not found: helm/values-$(DEPLOY_ENV).yaml"; \
			exit 1; \
		fi; \
		if ! command -v helm &> /dev/null; then \
			echo "❌ Helm is not installed"; \
			exit 1; \
		fi; \
		if ! kubectl cluster-info &> /dev/null; then \
			echo "❌ Kubernetes cluster not accessible"; \
			exit 1; \
		fi; \
		kubectl apply -f helm/namespace.yaml; \
		helm dependency update helm; \
		helm upgrade --install yuvro helm \
			--namespace yuvro \
			--create-namespace \
			--values helm/values-$(DEPLOY_ENV).yaml \
			|| true; \
		echo "✅ Deployment initiated! Check status with: make status DEPLOY_TYPE=k8s"; \
	fi

stop: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping all services..."; \
		docker compose $(COMPOSE_FILES) down; \
		echo "✅ All services stopped!"; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling from Kubernetes..."; \
		helm uninstall yuvro --namespace yuvro 2>/dev/null || true; \
		echo "✅ Uninstall complete!"; \
	fi

clean: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning all containers and volumes..."; \
		docker compose $(COMPOSE_FILES) down -v --remove-orphans; \
		docker system prune -f; \
		echo "✅ Cleanup complete!"; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🧹 Cleaning Kubernetes resources..."; \
		helm uninstall yuvro --namespace yuvro 2>/dev/null || true; \
		kubectl delete namespace yuvro 2>/dev/null || true; \
		kubectl delete namespace yobservability 2>/dev/null || true; \
		kubectl delete namespace ycode 2>/dev/null || true; \
		kubectl delete namespace ycampus 2>/dev/null || true; \
		echo "✅ Cleanup complete!"; \
	fi

logs: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing logs from all services (Ctrl+C to exit)..."; \
		docker compose $(COMPOSE_FILES) logs -f; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing logs from all pods (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/part-of=yuvro -f 2>/dev/null || echo "No pods found"; \
	fi

status: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📊 Docker Compose status:"; \
		docker compose $(COMPOSE_FILES) ps; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "📊 Kubernetes deployment status:"; \
		kubectl get all -n yuvro 2>/dev/null || echo "No resources found"; \
		echo ""; \
		echo "📊 Namespaces:"; \
		kubectl get namespaces | grep -E "^yuvro|^ycode|^ycampus" || true; \
	fi

port-forward: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🔌 Setting up port forwards..."; \
		echo "   YCode Frontend: http://localhost:3000"; \
		echo "   YCode Backend: http://localhost:8001"; \
		echo "   YCampus Frontend: http://localhost:3002"; \
		echo "   YCampus Backend: http://localhost:8003"; \
		echo "   Code Executor: http://localhost:8002"; \
		echo ""; \
		echo "Press Ctrl+C to stop port forwards"; \
		kubectl port-forward -n ycode svc/yuvro-ycode-frontend 3000:3000 2>/dev/null & \
		kubectl port-forward -n ycode svc/yuvro-ycode-backend 8001:8000 2>/dev/null & \
		kubectl port-forward -n ycampus svc/yuvro-ycampus-frontend 3002:3002 2>/dev/null & \
		kubectl port-forward -n ycampus svc/yuvro-ycampus-backend 8003:8000 2>/dev/null & \
		kubectl port-forward -n yuvro svc/yuvro-code-executor 8002:8002 2>/dev/null & \
		wait; \
	else \
		echo "❌ port-forward is only available for DEPLOY_TYPE=k8s"; \
	fi

# ============================================================================
# Platform-Specific Commands
# ============================================================================

install-ycode: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting YCode services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🚀 Deploying YCode to Kubernetes [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		if [ ! -f "helm/values-$(DEPLOY_ENV).yaml" ]; then \
			echo "❌ Values file not found: helm/values-$(DEPLOY_ENV).yaml"; \
			exit 1; \
		fi; \
		kubectl apply -f helm/namespace.yaml; \
		helm dependency update helm; \
		helm upgrade --install yuvro-code helm \
			--namespace yuvro \
			--create-namespace \
			--values helm/values-$(DEPLOY_ENV).yaml \
			--set ycode-backend.enabled=true \
			--set ycampus-backend.enabled=false \
			--set ycode-frontend.enabled=true \
			--set ycampus-frontend.enabled=false \
			--set code-executor.enabled=true \
			--set postgresql-ycode.enabled=true \
			--set postgresql-ycampus.enabled=false \
			|| true; \
		echo "✅ YCode deployment initiated! Check status with: make status DEPLOY_TYPE=k8s"; \
	fi

install-ycampus: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting YCampus services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🚀 Deploying YCampus to Kubernetes [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		if [ ! -f "helm/values-$(DEPLOY_ENV).yaml" ]; then \
			echo "❌ Values file not found: helm/values-$(DEPLOY_ENV).yaml"; \
			exit 1; \
		fi; \
		kubectl apply -f helm/namespace.yaml; \
		helm dependency update helm; \
		helm upgrade --install yuvro-code helm \
			--namespace yuvro \
			--create-namespace \
			--values helm/values-$(DEPLOY_ENV).yaml \
			--set ycode-backend.enabled=false \
			--set ycampus-backend.enabled=true \
			--set ycode-frontend.enabled=false \
			--set ycampus-frontend.enabled=true \
			--set code-executor.enabled=true \
			--set postgresql-ycode.enabled=false \
			--set postgresql-ycampus.enabled=true \
			|| true; \
		echo "✅ YCampus deployment initiated! Check status with: make status DEPLOY_TYPE=k8s"; \
	fi

run-ycode: install-ycode

run-ycampus: install-ycampus

stop-ycode: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping YCode services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling YCode from Kubernetes..."; \
		helm uninstall yuvro-code --namespace yuvro 2>/dev/null || true; \
		echo "✅ YCode uninstalled!"; \
	fi

stop-ycampus: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping YCampus services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling YCampus from Kubernetes..."; \
		helm uninstall yuvro-code --namespace yuvro 2>/dev/null || true; \
		echo "✅ YCampus uninstalled!"; \
	fi

clean-ycode: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning YCode containers and volumes..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down -v --remove-orphans; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🧹 Cleaning YCode Kubernetes resources..."; \
		helm uninstall yuvro-code --namespace yuvro 2>/dev/null || true; \
		echo "✅ YCode cleaned!"; \
	fi

clean-ycampus: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning YCampus containers and volumes..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down -v --remove-orphans; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🧹 Cleaning YCampus Kubernetes resources..."; \
		helm uninstall yuvro-code --namespace yuvro 2>/dev/null || true; \
		echo "✅ YCampus cleaned!"; \
	fi

logs-ycode: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing YCode logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing YCode Kubernetes logs (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/instance=yuvro-code -f 2>/dev/null || echo "No pods found"; \
	fi

logs-ycampus: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing YCampus logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing YCampus Kubernetes logs (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/instance=yuvro-code -f 2>/dev/null || echo "No pods found"; \
	fi

load-fixtures-ycode:
	@$(MAKE) -f Makefile.ycode load-courses

load-fixtures-ycampus:
	@$(MAKE) -f Makefile.ycampus load-courses

# ============================================================================
# Database Commands
# ============================================================================

makemigrations: makemigrations-ycode makemigrations-ycampus
	@echo "✅ makemigrations completed for YCode and YCampus"

makemigrations-ycode:
	@$(MAKE) -f Makefile.ycode db-makemigrations

makemigrations-ycampus:
	@$(MAKE) -f Makefile.ycampus db-makemigrations

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
	docker compose $(COMPOSE_FILES) -f docker-compose.observability.yml up

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
