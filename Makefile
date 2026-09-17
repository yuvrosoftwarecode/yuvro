# YC Full-Stack Application - Main Makefile
# This file provides a unified interface for managing YCode, YCampus, and Common services
#
# Usage:
#   make install                        - Run with defaults (DEPLOY_ENV=local, DEPLOY_TYPE=docker)
#   DEPLOY_ENV=dev make install         - Run in dev environment
#   DEPLOY_TYPE=k8s make install        - Use Kubernetes

.PHONY: help install run stop clean logs status port-forward
.PHONY: deploy-all deploy-ycode deploy-ycampus deploy-ylabs deploy-yhub deploy-code-executor
.PHONY: deployImages deployImages-ycode deployImages-ycampus deployImages-ylabs deployImages-yhub deployImages-code-executor
.PHONY: install-ycode install-ycampus install-ylabs install-yhub install-code-executor run-ycode run-ycampus run-ylabs run-yhub
.PHONY: stop-ycode stop-ycampus stop-ylabs stop-yhub stop-code-executor clean-ycode clean-ycampus clean-ylabs clean-yhub clean-code-executor
.PHONY: logs-ycode logs-ycampus logs-ylabs logs-yhub logs-code-executor load-fixtures-ycode load-fixtures-ycampus setup-fixtures-data setup-fixtures-data-ycode setup-fixtures-data-ycampus setup-fixtures-data-yhub setup-fixtures-data-ylabs reload-fixtures-data reload-fixtures-data-ycode reload-fixtures-data-ycampus reload-fixtures-data-yhub reload-fixtures-data-ylabs clear-fixtures-data clear-fixtures-data-ycode clear-fixtures-data-ycampus clear-fixtures-data-yhub clear-fixtures-data-ylabs load-courses-ycode load-courses-ycampus
.PHONY: test-all format-all lint-all check-all
.PHONY: makemigrations makemigrations-ycode makemigrations-ycampus makemigrations-yhub makemigrations-ylabs
.PHONY: db-reset db-reset-ycode db-reset-ycampus db-reset-ylabs db-reset-yhub
.PHONY: observability-dev observability-stop observability-clean observability-dashboards
.PHONY: observability-setup observability-validate
.PHONY: secrets-load secrets-validate secrets-rotate secrets-audit
.PHONY: prod-build prod-up prod-down
.PHONY: _validate-deploy load-env-files validate-env-files

# ============================================================================
# Environment Configuration
# ============================================================================

DEPLOY_ENV  ?= local
DEPLOY_BRANCH ?= main
# DEPLOY_TYPE mapping:
# - local: docker (local Docker Compose) - default
# - dev: docker (AWS EC2 with Docker) - default, can override with k8s
# - staging: k8s (Kubernetes) - default
# - prod: k8s (Kubernetes) - default
DEPLOY_TYPE ?= $(if $(filter staging prod,$(DEPLOY_ENV)),k8s,docker)

# Enable BuildKit for all docker builds (faster, cache mounts, smaller images)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Validate DEPLOY_ENV
VALID_DEPLOY_ENVS  := local dev staging prod
VALID_DEPLOY_TYPES := docker k8s

# Services list
SERVICES := ycode-backend ycampus-backend ylabs-backend yhub-backend ycode-frontend ycampus-frontend ylabs-frontend code-executor

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
			yhub-backend) \
				if [ -f "yhub-backend-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ yhub-backend-api/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ yhub-backend-api/.env.$(DEPLOY_ENV) not found"; \
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
			yhub-backend) \
				if [ ! -f "yhub-backend-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: yhub-backend-api/.env.$(DEPLOY_ENV)"; \
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
	@echo "  DEPLOY_BRANCH main (default) | any git branch (dev only)"
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
	@echo "  make install-ylabs      Build and start YLabs services only"
	@echo "  make install-yhub       Build and start YHub services only"
	@echo "  make install-code-executor Build and start Code Executor only"
	@echo "  make run-ycode          Start YCode services (no build)"
	@echo "  make run-ycampus        Start YCampus services (no build)"
	@echo "  make stop-ycode         Stop YCode services"
	@echo "  make stop-ycampus       Stop YCampus services"
	@echo "  make clean-ycode        Clean YCode containers/volumes"
	@echo "  make clean-ycampus      Clean YCampus containers/volumes"
	@echo "  make logs-ycode         View YCode logs"
	@echo "  make logs-ycampus       View YCampus logs"
	@echo "  make setup-fixtures-data        Load fixture data for all apps"
	@echo "  make setup-fixtures-data-ycode  Load YCode fixture data"
	@echo "  make setup-fixtures-data-ycampus Load YCampus fixture data"
	@echo "  make setup-fixtures-data-yhub   Load YHub fixture data"
	@echo "  make setup-fixtures-data-ylabs  Load YLabs fixture data"
	@echo "  make reload-fixtures-data       Clear and reload fixture data for all apps"
	@echo "  make reload-fixtures-data-ycode Clear and reload YCode fixture data"
	@echo "  make reload-fixtures-data-ycampus Clear and reload YCampus fixture data"
	@echo "  make reload-fixtures-data-yhub  Clear and reload YHub fixture data"
	@echo "  make reload-fixtures-data-ylabs Clear and reload YLabs fixture data"
	@echo ""
	@echo "  make load-courses-ycode        Load courses only into YCode"
	@echo "  make load-courses-ycampus      Load courses only into YCampus"
	@echo ""
	@echo "Database Reset Commands:"
	@echo "  make db-reset                       Reset all databases (all apps)"
	@echo "  make db-reset-ycode                 Reset YCode database only"
	@echo "  make db-reset-ycampus               Reset YCampus database only"
	@echo "  make db-reset-ylabs                 Reset YLabs database only"
	@echo "  make db-reset-yhub                  Reset YHub database only"
	@echo ""
	@echo "Per-App Dev Deploy (DEPLOY_BRANCH=<branch> make deploy-<app>):"
	@echo "  make deploy-all                     Deploy all services to dev"
	@echo "  make deploy-ycode                   Deploy YCode only"
	@echo "  make deploy-ycampus                 Deploy YCampus only"
	@echo "  make deploy-ylabs                   Deploy YLabs only"
	@echo "  make deploy-yhub                    Deploy YHub only"
	@echo "  make deploy-code-executor           Deploy Code Executor only"
	@echo ""
	@echo "Image Build Commands (cache-friendly, BuildKit):"
	@echo "  make deployImages                   Build all images (from cache)"
	@echo "  make deployImages-ycode             Build YCode images only"
	@echo "  make deployImages-ycampus           Build YCampus images only"
	@echo "  make deployImages-ylabs             Build YLabs images only"
	@echo "  make deployImages-yhub              Build YHub images only"
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
  COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.ylabs.yml -f docker-compose.yhub.yml $(ENV_OVERRIDE)
endif

install: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Deploying to AWS EC2 using OpenTofu [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		echo ""; \
		bash infra/scripts/deploy-dev-auto.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🔨 Building and starting all services [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker compose $(COMPOSE_FILES) down --remove-orphans 2>/dev/null || true; \
		docker compose $(COMPOSE_FILES) build --build-arg BUILDKIT_INLINE_CACHE=1; \
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
		bash infra/scripts/deploy-dev-auto.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting all services [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_TYPE=docker]..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker compose $(COMPOSE_FILES) up -d --wait || { \
			echo "❌ One or more services failed to become healthy. Showing logs:"; \
			docker compose $(COMPOSE_FILES) ps; \
			docker compose $(COMPOSE_FILES) logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ All services are up and healthy!"; \
		echo ""; \
		docker compose $(COMPOSE_FILES) ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YCode Frontend:    http://localhost:3000"; \
		echo "   YCode Backend:     http://localhost:8000"; \
		echo "   YCampus Frontend:  http://localhost:3001"; \
		echo "   YCampus Backend:   http://localhost:8001"; \
		echo "   YLabs Frontend:    http://localhost:3002"; \
		echo "   YLabs Backend:     http://localhost:8002"; \
		echo "   YHub Backend:      http://localhost:8003"; \
		echo "   Code Executor:     http://localhost:8009"; \
		echo ""; \
		echo "📺 Showing live logs. Press Ctrl+C to stop."; \
			docker compose $(COMPOSE_FILES) logs -f; \
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
			--wait \
			--timeout 5m \
			|| { echo "❌ Deployment failed. Check: kubectl get pods -n yuvro"; exit 1; }; \
		echo "✅ Deployment complete! Check status with: make status DEPLOY_TYPE=k8s"; \
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
		echo "   YCode Backend: http://localhost:8000"; \
		echo "   YCampus Frontend: http://localhost:3001"; \
		echo "   YCampus Backend: http://localhost:8001"; \
		echo "   Code Executor: http://localhost:8009"; \
		echo ""; \
		echo "Press Ctrl+C to stop port forwards"; \
		kubectl port-forward -n ycode svc/yuvro-ycode-frontend 3000:3000 2>/dev/null & \
		kubectl port-forward -n ycode svc/yuvro-ycode-backend 8000:8000 2>/dev/null & \
		kubectl port-forward -n ycampus svc/yuvro-ycampus-frontend 3001:3001 2>/dev/null & \
		kubectl port-forward -n ycampus svc/yuvro-ycampus-backend 8001:8000 2>/dev/null & \
		kubectl port-forward -n yuvro svc/yuvro-code-executor 8009:8009 2>/dev/null & \
		wait; \
	else \
		echo "❌ port-forward is only available for DEPLOY_TYPE=k8s"; \
	fi

# ============================================================================
# Platform-Specific Commands
# ============================================================================

install-ycode: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🔨 Building YCode services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
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
		echo "🔨 Building YCampus services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
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
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up -d --wait || { \
			echo "❌ One or more YCode services failed to become healthy. Showing logs:"; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ YCode services are up and healthy!"; \
		echo ""; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YCode Frontend:  http://localhost:3000"; \
		echo "   YCode Backend:   http://localhost:8000"; \
		echo "   Code Executor:   http://localhost:8009"; \
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
			--wait \
			--timeout 5m \
			|| { echo "❌ Deployment failed. Check: kubectl get pods -n yuvro"; exit 1; }; \
		echo "✅ YCode deployment complete! Check status with: make status DEPLOY_TYPE=k8s"; \
	fi

run-ycampus: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting YCampus services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up -d --wait || { \
			echo "❌ One or more YCampus services failed to become healthy. Showing logs:"; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ YCampus services are up and healthy!"; \
		echo ""; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YCampus Frontend:  http://localhost:3001"; \
		echo "   YCampus Backend:   http://localhost:8001"; \
		echo "   Code Executor:     http://localhost:8009"; \
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
			--wait \
			--timeout 5m \
			|| { echo "❌ Deployment failed. Check: kubectl get pods -n yuvro"; exit 1; }; \
		echo "✅ YCampus deployment complete! Check status with: make status DEPLOY_TYPE=k8s"; \
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

install-yhub: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🔨 Building YHub services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YHub services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	else \
		echo "❌ Kubernetes deployment for YHub is not configured"; \
	fi

install-ylabs: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🔨 Building YLabs services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YLabs services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	else \
		echo "❌ Kubernetes deployment for YLabs is not configured"; \
	fi

install-code-executor: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🔨 Building Code Executor [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.code-executor.yml \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting Code Executor..."; \
		docker compose -f docker-compose.code-executor.yml up; \
	else \
		echo "❌ Kubernetes deployment for Code Executor is not configured"; \
	fi

run-yhub: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting YHub services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up -d --wait || { \
			echo "❌ One or more YHub services failed to become healthy. Showing logs:"; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ YHub services are up and healthy!"; \
		echo ""; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YHub Backend:   http://localhost:8003"; \
		echo "   Code Executor:  http://localhost:8009"; \
	else \
		echo "❌ Kubernetes run for YHub is not configured"; \
	fi

stop-yhub: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping YHub services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	fi

clean-yhub: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning YHub containers and volumes..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down -v --remove-orphans; \
	fi

logs-yhub: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing YHub logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	fi

# YLabs
run-ylabs: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting YLabs services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up -d --wait || { \
			echo "❌ One or more YLabs services failed to become healthy. Showing logs:"; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
			docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ YLabs services are up and healthy!"; \
		echo ""; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YLabs Frontend:  http://localhost:3002"; \
		echo "   YLabs Backend:   http://localhost:8002"; \
	else \
		echo "❌ Kubernetes run for YLabs is not configured"; \
	fi

stop-ylabs: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping YLabs services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	fi

clean-ylabs: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning YLabs containers and volumes..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down -v --remove-orphans; \
	fi

logs-ylabs: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing YLabs logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	fi

# Code Executor
run-code-executor: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🚀 Starting Code Executor [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker network create executor 2>/dev/null || true; \
		docker compose -f docker-compose.code-executor.yml up -d --wait || { \
			echo "❌ Code Executor failed to become healthy. Showing logs:"; \
			docker compose -f docker-compose.code-executor.yml ps; \
			docker compose -f docker-compose.code-executor.yml logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ Code Executor is up and healthy!"; \
		echo ""; \
		docker compose -f docker-compose.code-executor.yml ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   Code Executor:  http://localhost:8009"; \
	else \
		echo "❌ Kubernetes run for Code Executor is not configured"; \
	fi

stop-code-executor: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🛑 Stopping Code Executor..."; \
		docker compose -f docker-compose.code-executor.yml down; \
	fi

clean-code-executor: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "🧹 Cleaning Code Executor containers and volumes..."; \
		docker compose -f docker-compose.code-executor.yml down -v --remove-orphans; \
	fi

logs-code-executor: _validate-deploy
	@if [ "$(DEPLOY_TYPE)" = "docker" ]; then \
		echo "📝 Viewing Code Executor logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.code-executor.yml logs -f; \
	fi

load-fixtures-ycode:
	@$(MAKE) -f Makefile.ycode load-courses

load-fixtures-ycampus:
	@$(MAKE) -f Makefile.ycampus load-courses

setup-fixtures-data:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Loading fixtures on EC2 for all apps..."; \
		bash infra/scripts/runFixtures.sh; \
	else \
		$(MAKE) -f Makefile.yhub load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
		$(MAKE) -f Makefile.ycode load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
		$(MAKE) -f Makefile.ylabs load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
		$(MAKE) -f Makefile.ycampus load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

setup-fixtures-data-ycode:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Loading fixtures for YCode on EC2..."; \
		bash infra/scripts/runFixtures.sh ycode; \
	else \
		$(MAKE) -f Makefile.ycode load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

setup-fixtures-data-ycampus:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Loading fixtures for YCampus on EC2..."; \
		bash infra/scripts/runFixtures.sh ycampus; \
	else \
		$(MAKE) -f Makefile.ycampus load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

setup-fixtures-data-yhub:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Loading fixtures for YHub on EC2..."; \
		bash infra/scripts/runFixtures.sh yhub; \
	else \
		$(MAKE) -f Makefile.yhub load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

setup-fixtures-data-ylabs:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Loading fixtures for YLabs on EC2..."; \
		bash infra/scripts/runFixtures.sh ylabs; \
	else \
		$(MAKE) -f Makefile.ylabs load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

reload-fixtures-data:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Reloading fixtures with clear on EC2 for all apps..."; \
		bash infra/scripts/runFixtures.sh all --clear; \
	else \
		$(MAKE) -f Makefile.yhub reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
		$(MAKE) -f Makefile.ycode reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
		$(MAKE) -f Makefile.ylabs reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
		$(MAKE) -f Makefile.ycampus reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

clear-fixtures-data: reload-fixtures-data

reload-fixtures-data-ycode:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Reloading fixtures with clear for YCode on EC2..."; \
		bash infra/scripts/runFixtures.sh ycode --clear; \
	else \
		$(MAKE) -f Makefile.ycode reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

clear-fixtures-data-ycode: reload-fixtures-data-ycode

reload-fixtures-data-ycampus:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Reloading fixtures with clear for YCampus on EC2..."; \
		bash infra/scripts/runFixtures.sh ycampus --clear; \
	else \
		$(MAKE) -f Makefile.ycampus reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

clear-fixtures-data-ycampus: reload-fixtures-data-ycampus

reload-fixtures-data-yhub:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Reloading fixtures with clear for YHub on EC2..."; \
		bash infra/scripts/runFixtures.sh yhub --clear; \
	else \
		$(MAKE) -f Makefile.yhub reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

clear-fixtures-data-yhub: reload-fixtures-data-yhub

reload-fixtures-data-ylabs:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Reloading fixtures with clear for YLabs on EC2..."; \
		bash infra/scripts/runFixtures.sh ylabs --clear; \
	else \
		$(MAKE) -f Makefile.ylabs reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

clear-fixtures-data-ylabs: reload-fixtures-data-ylabs

load-courses-ycode:
	@$(MAKE) -f Makefile.ycode load-courses

load-courses-ycampus:
	@$(MAKE) -f Makefile.ycampus load-courses

# ============================================================================
# Database Commands
# ============================================================================

makemigrations: makemigrations-ycode makemigrations-ycampus makemigrations-yhub makemigrations-ylabs
	@echo "✅ makemigrations completed for YCode, YCampus, YHub, and YLabs"

makemigrations-ycode:
	@$(MAKE) -f Makefile.ycode db-makemigrations

makemigrations-ycampus:
	@$(MAKE) -f Makefile.ycampus db-makemigrations

makemigrations-yhub:
	@$(MAKE) -f Makefile.yhub db-makemigrations

makemigrations-ylabs:
	@$(MAKE) -f Makefile.ylabs db-makemigrations

clear-migrations:
	@echo "🔎 Showing migration files (dry-run). Use '-y' to delete."
	@sh infra/scripts/clear_migrations.sh

# Reset databases: bring down, remove volumes, start DBs and run migrations
db-reset: _validate-deploy
	@echo "🧹 Resetting all databases (removing containers + named volumes)..."
	@docker network create executor 2>/dev/null || true
	@docker network create yuvro_ylabs 2>/dev/null || true
	@docker compose $(COMPOSE_FILES) stop ycode-backend ycampus-backend yhub-backend ylabs-backend 2>/dev/null || true
	@docker compose $(COMPOSE_FILES) rm -s -f ycode-db ycampus-db yhub-db ylabs-db 2>/dev/null || true
	@docker volume rm yuvro_ycode_postgres_data yuvro_ycampus_postgres_data yuvro_yhub_postgres_data yuvro_ylabs_postgres_data 2>/dev/null || true
	@echo "🚀 Starting fresh databases..."
	@docker compose $(COMPOSE_FILES) up -d ycode-db ycampus-db yhub-db ylabs-db
	@echo "⏳ Waiting for databases to become healthy..."
	@sleep 10
	@docker compose $(COMPOSE_FILES) start ycode-backend ycampus-backend yhub-backend ylabs-backend 2>/dev/null || \
		docker compose $(COMPOSE_FILES) up -d ycode-backend ycampus-backend yhub-backend ylabs-backend
	@echo "✅ All databases reset complete (migrations applied on backend restart)."

db-reset-ycode:
	@$(MAKE) -f Makefile.ycode db-reset

db-reset-ycampus:
	@$(MAKE) -f Makefile.ycampus db-reset

db-reset-ylabs:
	@$(MAKE) -f Makefile.ylabs db-reset

db-reset-yhub:
	@$(MAKE) -f Makefile.yhub db-reset

# ============================================================================
# Per-App Dev Deploy Commands (DEPLOY_ENV=dev only)
# ============================================================================

deploy-all:
	@echo "🚀 Deploying ALL services to dev [branch=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/deploy-all.sh $(DEPLOY_BRANCH)

deploy-ycode:
	@echo "🚀 Deploying YCode to dev [branch=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/deploy-ycode.sh $(DEPLOY_BRANCH)

deploy-ycampus:
	@echo "🚀 Deploying YCampus to dev [branch=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/deploy-ycampus.sh $(DEPLOY_BRANCH)

deploy-ylabs:
	@echo "🚀 Deploying YLabs to dev [branch=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/deploy-ylabs.sh $(DEPLOY_BRANCH)

deploy-yhub:
	@echo "🚀 Deploying YHub to dev [branch=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/deploy-yhub.sh $(DEPLOY_BRANCH)

deploy-code-executor:
	@echo "🚀 Deploying Code Executor to dev [branch=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/deploy-code-executor.sh $(DEPLOY_BRANCH)

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
	@echo "   Grafana: http://localhost:3003 (admin/admin)"
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

# ============================================================================
# Image Build Targets (cache-friendly)
# Build images with BuildKit layer cache. Uses CACHEBUST=$(date +%s) so
# application code is always refreshed while expensive install layers stay cached.
# ============================================================================

deployImages: _validate-deploy
	@echo "🐳 Building all images [DEPLOY_ENV=$(DEPLOY_ENV)] (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose $(COMPOSE_FILES) build \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		--build-arg CACHEBUST=$$CACHEBUST
	@echo "✅ All images built!"

deployImages-ycode: _validate-deploy
	@echo "🐳 Building YCode images (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		ycode-backend ycode-frontend yuvro-code-executor
	@echo "✅ YCode images built!"

deployImages-ycampus: _validate-deploy
	@echo "🐳 Building YCampus images (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		ycampus-backend ycampus-frontend
	@echo "✅ YCampus images built!"

deployImages-ylabs: _validate-deploy
	@echo "🐳 Building YLabs images (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		ylabs-backend ylabs-frontend
	@echo "✅ YLabs images built!"

deployImages-yhub: _validate-deploy
	@echo "🐳 Building YHub images (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		yhub-backend
	@echo "✅ YHub images built!"

deployImages-code-executor: _validate-deploy
	@echo "🐳 Building Code Executor image (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose -f docker-compose.code-executor.yml \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		yuvro-code-executor
	@echo "✅ Code Executor image built!"