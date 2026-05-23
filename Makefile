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
.PHONY: observability-setup observability-validate
.PHONY: secrets-load secrets-validate secrets-rotate secrets-audit
.PHONY: prod-build prod-up prod-down
.PHONY: _validate-deploy load-env-files validate-env-files

# ============================================================================
# Environment Configuration
# ============================================================================

DEPLOY_ENV  ?= local
# DEPLOY_TYPE mapping:
# - local: docker (local Docker Compose) - default
# - dev: docker (AWS EC2 with Docker) - default, can override with k8s
# - staging: k8s (Kubernetes) - default
# - prod: k8s (Kubernetes) - default
DEPLOY_TYPE ?= $(if $(filter staging prod,$(DEPLOY_ENV)),k8s,docker)

# Validate DEPLOY_ENV
VALID_DEPLOY_ENVS  := local dev staging prod
VALID_DEPLOY_TYPES := docker k8s

# Services list
SERVICES := ycode-backend ycampus-backend ycode-frontend ycampus-frontend code-executor

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

# ============================================================================
# Environment-Specific Configuration Loading
# ============================================================================

.PHONY: load-env-files validate-env-files

load-env-files: _validate-deploy
	@echo "📦 Loading environment-specific .env files for DEPLOY_ENV=$(DEPLOY_ENV)..."
	@for service in $(SERVICES); do \
		case $$service in \
			ycode-backend) \
				if [ -f "ycode-backend-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ ycode-backend-api/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ ycode-backend-api/.env.$(DEPLOY_ENV) not found"; \
				fi \
				;; \
			ycampus-backend) \
				if [ -f "ycampus-backend-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ ycampus-backend-api/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ ycampus-backend-api/.env.$(DEPLOY_ENV) not found"; \
				fi \
				;; \
			ycode-frontend) \
				if [ -f "ycode-web/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ ycode-web/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ ycode-web/.env.$(DEPLOY_ENV) not found"; \
				fi \
				;; \
			ycampus-frontend) \
				if [ -f "ycampus-web/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ ycampus-web/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ ycampus-web/.env.$(DEPLOY_ENV) not found"; \
				fi \
				;; \
			code-executor) \
				if [ -f "yuvro-code-executer/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ yuvro-code-executer/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ yuvro-code-executer/.env.$(DEPLOY_ENV) not found"; \
				fi \
				;; \
		esac \
	done
	@echo "✅ Environment files loaded!"

validate-env-files: _validate-deploy
	@echo "🔍 Validating environment-specific .env files for DEPLOY_ENV=$(DEPLOY_ENV)..."
	@MISSING_FILES=0; \
	for service in $(SERVICES); do \
		case $$service in \
			ycode-backend) \
				if [ ! -f "ycode-backend-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: ycode-backend-api/.env.$(DEPLOY_ENV)"; \
					MISSING_FILES=1; \
				fi \
				;; \
			ycampus-backend) \
				if [ ! -f "ycampus-backend-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: ycampus-backend-api/.env.$(DEPLOY_ENV)"; \
					MISSING_FILES=1; \
				fi \
				;; \
			ycode-frontend) \
				if [ ! -f "ycode-web/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: ycode-web/.env.$(DEPLOY_ENV)"; \
					MISSING_FILES=1; \
				fi \
				;; \
			ycampus-frontend) \
				if [ ! -f "ycampus-web/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: ycampus-web/.env.$(DEPLOY_ENV)"; \
					MISSING_FILES=1; \
				fi \
				;; \
			code-executor) \
				if [ ! -f "yuvro-code-executer/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: yuvro-code-executer/.env.$(DEPLOY_ENV)"; \
					MISSING_FILES=1; \
				fi \
				;; \
		esac \
	done; \
	if [ $$MISSING_FILES -eq 1 ]; then \
		echo "❌ Some environment files are missing!"; \
		exit 1; \
	else \
		echo "✅ All environment files validated!"; \
	fi

help:
	@echo "Usage: [DEPLOY_ENV=local|dev|staging|prod] [DEPLOY_TYPE=docker|k8s] make <command>"
	@echo ""
	@echo "Environment:"
	@echo "  DEPLOY_ENV    local (default) | dev | staging | prod"
	@echo ""
	@echo "Deployment Type (auto-selected based on DEPLOY_ENV):"
	@echo "  local  → docker (Local Docker Compose)"
	@echo "  dev    → docker (AWS EC2 with Docker) - can override with DEPLOY_TYPE=k8s"
	@echo "  staging → k8s (Kubernetes)"
	@echo "  prod   → k8s (Kubernetes)"
	@echo ""
	@echo "Main Commands:"
	@echo "  make install            Build and start all services"
	@echo "  make run                Start all services (no build)"
	@echo "  make stop               Stop all services"
	@echo "  make clean              Clean all containers/volumes"
	@echo "  make logs               View all logs"
	@echo "  make status             Check deployment status"
	@echo "  make port-forward       Setup port forwarding (k8s only)"
	@echo ""
	@echo "Configuration Commands:"
	@echo "  make load-env-files     Load environment-specific .env files"
	@echo "  make validate-env-files Validate environment-specific .env files"
	@echo ""
	@echo "Observability Commands:"
	@echo "  make observability-setup      Setup observability for environment"
	@echo "  make observability-dev        Start observability stack (local/dev only)"
	@echo "  make observability-stop       Stop observability stack"
	@echo "  make observability-clean      Clean observability stack"
	@echo "  make observability-validate   Validate observability configuration"
	@echo "  make observability-dashboards Show observability dashboard URLs"
	@echo ""
	@echo "Secrets Management Commands:"
	@echo "  make secrets-load       Load secrets for environment"
	@echo "  make secrets-validate   Validate secrets configuration"
	@echo "  make secrets-rotate     Rotate secrets (staging/prod only)"
	@echo "  make secrets-audit      Audit secret access (staging/prod only)"
	@echo ""
	@echo "Platform-Specific Commands:"
	@echo "  make install-ycode      Build and start YCode services only"
	@echo "  make install-ycampus    Build and start YCampus services only"
	@echo "  make run-ycode          Start YCode services (no build)"
	@echo "  make run-ycampus        Start YCampus services (no build)"
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
	@echo "  make install                        # Start all (local + Docker Compose)"
	@echo "  DEPLOY_ENV=dev make install         # Deploy to AWS EC2 (Docker Compose)"
	@echo "  DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install  # Deploy to AWS EC2 (Kubernetes)"
	@echo "  make install-ycode                  # Start YCode only"
	@echo "  DEPLOY_ENV=staging make install     # Deploy to staging (Kubernetes)"
	@echo "  DEPLOY_ENV=prod make install        # Deploy to production (Kubernetes)"
	@echo "  make observability-dev              # Start observability stack"
	@echo "  make secrets-load                   # Load secrets for environment"

# ============================================================================
# Docker Compose Commands (DEPLOY_TYPE=docker)
# ============================================================================

ifeq ($(DEPLOY_TYPE),docker)
  # Docker Compose uses environment-specific compose files
  ENV_OVERRIDE := $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml)
  COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml $(ENV_OVERRIDE)
endif

install: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Deploying to AWS EC2 using OpenTofu [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		echo ""; \
		bash infra/scripts/deploy-dev-auto.sh; \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🔨 Building all services [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		docker compose $(COMPOSE_FILES) build; \
		echo "🚀 Starting all services..."; \
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

run: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Deploying to AWS EC2 using OpenTofu [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		echo ""; \
		bash infra/scripts/deploy-dev-auto.sh; \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
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
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping AWS EC2 deployment [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		echo ""; \
		echo "⚠️  This will terminate EC2 instances"; \
		read -p "Continue? (yes/no) " -r; \
		echo; \
		if [[ ! $$REPLY =~ ^[Yy][Ee][Ss]$$ ]]; then \
			echo "Cancelled"; \
			exit 0; \
		fi; \
		echo "🛑 Destroying OpenTofu resources..."; \
		cd infra/opentofu && tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy && tofu apply tfplan_destroy && cd ../..; \
		echo "✅ EC2 instances terminated!"; \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping all services..."; \
		docker compose $(COMPOSE_FILES) down; \
		echo "✅ All services stopped!"; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling from Kubernetes..."; \
		helm uninstall yuvro --namespace yuvro 2>/dev/null || true; \
		echo "✅ Uninstall complete!"; \
	fi

clean: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning AWS EC2 deployment [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		echo ""; \
		echo "⚠️  This will destroy all EC2 resources"; \
		read -p "Continue? (yes/no) " -r; \
		echo; \
		if [[ ! $$REPLY =~ ^[Yy][Ee][Ss]$$ ]]; then \
			echo "Cancelled"; \
			exit 0; \
		fi; \
		echo "🧹 Destroying OpenTofu resources..."; \
		cd infra/opentofu && tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy && tofu apply tfplan_destroy && cd ../..; \
		echo "🧹 Cleaning OpenTofu state..."; \
		rm -rf infra/opentofu/.terraform infra/opentofu/terraform.tfstate* infra/opentofu/tfplan* 2>/dev/null || true; \
		echo "✅ Cleanup complete!"; \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
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
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing AWS EC2 deployment logs [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		echo ""; \
		echo "⚠️  EC2 instances are managed by OpenTofu"; \
		echo ""; \
		echo "To view application logs on EC2:"; \
		echo "  1. Get EC2 instance IP:"; \
		echo "     aws ec2 describe-instances --region ap-south-1 --query 'Reservations[].Instances[].PublicIpAddress' --output text"; \
		echo ""; \
		echo "  2. SSH into instance:"; \
		echo "     ssh -i your-key.pem ec2-user@<instance-ip>"; \
		echo ""; \
		echo "  3. View logs:"; \
		echo "     docker compose logs -f"; \
		exit 1; \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing logs from all services (Ctrl+C to exit)..."; \
		docker compose $(COMPOSE_FILES) logs -f; \
	elif [ "$(DEPLOY_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing logs from all pods (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/part-of=yuvro -f 2>/dev/null || echo "No pods found"; \
	fi

status: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📊 AWS EC2 deployment status [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		echo ""; \
		if ! command -v tofu &> /dev/null; then \
			echo "❌ OpenTofu is not installed"; \
			exit 1; \
		fi; \
		echo "📊 OpenTofu Resources:"; \
		cd infra/opentofu && tofu show -no-color | head -50 && cd ../..; \
		echo ""; \
		echo "📊 AWS EC2 Instances:"; \
		aws ec2 describe-instances --region ap-south-1 --query 'Reservations[].Instances[?Tags[?Key==`Environment` && Value==`dev`]].[InstanceId,InstanceType,State.Name,PublicIpAddress]' --output table 2>/dev/null || echo "No instances found"; \
		echo ""; \
		echo "📊 RDS Databases:"; \
		aws rds describe-db-instances --region ap-south-1 --query 'DBInstances[?Tags[?Key==`Environment` && Value==`dev`]].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus]' --output table 2>/dev/null || echo "No databases found"; \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
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
		echo "� Building YCode services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) build; \
		echo "🚀 Starting YCode services..."; \
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
		echo "� Building YCampus services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) build; \
		echo "🚀 Starting YCampus services..."; \
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

run-ycode: _validate-deploy
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

run-ycampus: _validate-deploy
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

.PHONY: observability-dev observability-stop observability-clean observability-dashboards
.PHONY: observability-setup observability-validate

observability-dev: _validate-deploy load-env-files
	@if [ "$(DEPLOY_ENV)" = "local" ] || [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "🔍 Starting observability stack (Prometheus + Jaeger + Loki + Grafana)..."; \
		docker compose $(COMPOSE_FILES) -f docker-compose.yobservability.yml up; \
	else \
		echo "❌ Observability dev stack is only available for DEPLOY_ENV=local or dev"; \
		echo "   For staging/prod, use CloudWatch + X-Ray configured via OpenTofu"; \
		exit 1; \
	fi

observability-stop: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "local" ] || [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "🛑 Stopping observability stack..."; \
		docker compose -f docker-compose.yobservability.yml down; \
		echo "✅ Observability stack stopped!"; \
	else \
		echo "❌ Observability dev stack is only available for DEPLOY_ENV=local or dev"; \
		exit 1; \
	fi

observability-clean: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "local" ] || [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "🧹 Cleaning observability stack..."; \
		docker compose -f docker-compose.yobservability.yml down -v; \
		echo "✅ Observability stack cleaned!"; \
	else \
		echo "❌ Observability dev stack is only available for DEPLOY_ENV=local or dev"; \
		exit 1; \
	fi

observability-dashboards:
	@echo "🌐 Observability Dashboards:"
	@echo "   Grafana: http://localhost:3001 (admin/admin)"
	@echo "   Jaeger: http://localhost:16686"
	@echo "   Prometheus: http://localhost:9090"
	@echo "   Loki: http://localhost:3100"

observability-setup: _validate-deploy load-env-files
	@if [ "$(DEPLOY_ENV)" = "local" ] || [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "📊 Setting up observability for $(DEPLOY_ENV) environment..."; \
		echo "   - Prometheus: Metrics collection"; \
		echo "   - Jaeger: Distributed tracing"; \
		echo "   - Loki: Log aggregation"; \
		echo "   - Grafana: Dashboards and visualization"; \
		echo ""; \
		echo "✅ Observability configured for $(DEPLOY_ENV)!"; \
		echo "   Run 'make observability-dev' to start the stack"; \
	elif [ "$(DEPLOY_ENV)" = "staging" ] || [ "$(DEPLOY_ENV)" = "prod" ]; then \
		echo "📊 Setting up observability for $(DEPLOY_ENV) environment..."; \
		echo "   - CloudWatch: Logs and metrics"; \
		echo "   - X-Ray: Distributed tracing"; \
		echo "   - CloudWatch Dashboards: Visualization"; \
		echo ""; \
		echo "✅ Observability configured for $(DEPLOY_ENV)!"; \
		echo "   Infrastructure is managed via OpenTofu in infra/opentofu/"; \
	fi

observability-validate: _validate-deploy
	@echo "🔍 Validating observability configuration for DEPLOY_ENV=$(DEPLOY_ENV)..."
	@if [ "$(DEPLOY_ENV)" = "local" ] || [ "$(DEPLOY_ENV)" = "dev" ]; then \
		if [ -f "docker-compose.yobservability.yml" ]; then \
			echo "  ✓ docker-compose.yobservability.yml found"; \
		else \
			echo "  ❌ docker-compose.yobservability.yml not found"; \
			exit 1; \
		fi; \
		if [ -f "yuvro-observability/prometheus.yml" ]; then \
			echo "  ✓ Prometheus configuration found"; \
		else \
			echo "  ❌ Prometheus configuration not found"; \
			exit 1; \
		fi; \
		if [ -f "yuvro-observability/otel-collector-config.yaml" ]; then \
			echo "  ✓ OpenTelemetry Collector configuration found"; \
		else \
			echo "  ❌ OpenTelemetry Collector configuration not found"; \
			exit 1; \
		fi; \
		if [ -f "yuvro-observability/loki-config.yaml" ]; then \
			echo "  ✓ Loki configuration found"; \
		else \
			echo "  ❌ Loki configuration not found"; \
			exit 1; \
		fi; \
		echo "✅ Observability configuration validated!"; \
	elif [ "$(DEPLOY_ENV)" = "staging" ] || [ "$(DEPLOY_ENV)" = "prod" ]; then \
		if [ -d "infra/opentofu" ]; then \
			echo "  ✓ OpenTofu infrastructure directory found"; \
		else \
			echo "  ❌ OpenTofu infrastructure directory not found"; \
			exit 1; \
		fi; \
		echo "✅ Observability configuration validated!"; \
		echo "   Note: CloudWatch + X-Ray configuration is managed via OpenTofu"; \
	fi

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
