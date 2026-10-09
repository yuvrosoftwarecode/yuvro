# YC Full-Stack Application - Main Makefile
# This file provides a unified interface for managing YCode, YCampus, and Common services
#
# Usage:
#   make install                        - Run with defaults (DEPLOY_ENV=local, DEPLOY_INFRA_TYPE=local)
#   DEPLOY_ENV=dev DEPLOY_INFRA_TYPE=ec2 make install  - Run in dev environment with EC2
#   DEPLOY_INFRA_TYPE=eks make install  - Use EKS/Kubernetes

.PHONY: help install run stop logs status port-forward
.PHONY: deploy deploy-infra deploy-common-apps deploy-ycode deploy-ycampus deploy-ylabs deploy-yhub deploy-ymarketplace deploy-code-executor
.PHONY: destroy destroy-common-apps destroy-ycode destroy-ycampus destroy-ylabs destroy-yhub destroy-ymarketplace destroy-code-executor
.PHONY: kompose-regen-ycode kompose-regen-ycampus kompose-regen-ylabs kompose-regen-yhub kompose-regen-ymarketplace kompose-regen-code-executor kompose-regen-all
.PHONY: deployImages deployImages-ycode deployImages-ycampus deployImages-ylabs deployImages-yhub deployImages-ymarketplace deployImages-code-executor
.PHONY: install-ycode install-ycampus install-ylabs install-yhub install-ymarketplace install-code-executor run-ycode run-ycampus run-ylabs run-yhub run-ymarketplace
.PHONY: stop-ycode stop-ycampus stop-ylabs stop-yhub stop-ymarketplace stop-code-executor
.PHONY: logs-ycode logs-ycampus logs-ylabs logs-yhub logs-ymarketplace logs-code-executor load-fixtures-ycode load-fixtures-ycampus setup-fixtures-data setup-fixtures-data-ycode setup-fixtures-data-ycampus setup-fixtures-data-yhub setup-fixtures-data-ylabs setup-fixtures-data-ymarketplace reload-fixtures-data reload-fixtures-data-ycode reload-fixtures-data-ycampus reload-fixtures-data-yhub reload-fixtures-data-ylabs reload-fixtures-data-ymarketplace clear-fixtures-data clear-fixtures-data-ycode clear-fixtures-data-ycampus clear-fixtures-data-yhub clear-fixtures-data-ylabs clear-fixtures-data-ymarketplace load-courses-ycode load-courses-ycampus
.PHONY: test-all format-all lint-all check-all
.PHONY: makemigrations makemigrations-ycode makemigrations-ycampus makemigrations-yhub makemigrations-ylabs makemigrations-ymarketplace
.PHONY: db-reset db-reset-ycode db-reset-ycampus db-reset-ylabs db-reset-yhub db-reset-ymarketplace
.PHONY: observability-dev observability-stop observability-clean observability-dashboards
.PHONY: observability-setup observability-validate
.PHONY: secrets-load secrets-validate secrets-rotate secrets-audit
.PHONY: prod-build prod-up prod-down
.PHONY: _validate-deploy load-env-files validate-env-files

# ============================================================================
# Environment Configuration
# ============================================================================

DEPLOY_ENV      ?= local
DEPLOY_BRANCH   ?= main
DEPLOY_INFRA_TYPE ?= local

# Enable BuildKit for all docker builds (faster, cache mounts, smaller images)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Validate DEPLOY_ENV and DEPLOY_INFRA_TYPE
VALID_DEPLOY_ENVS       := local dev prod
VALID_DEPLOY_INFRA_TYPES := local ec2 ecs eks k8s

# Determine deployment type from DEPLOY_INFRA_TYPE
# Map DEPLOY_INFRA_TYPE to script directory names
ifeq ($(DEPLOY_INFRA_TYPE),local)
  INFRA_SCRIPTS_DIR := local_docker
else ifeq ($(DEPLOY_INFRA_TYPE),ec2)
  INFRA_SCRIPTS_DIR := dev_ec2
else ifeq ($(DEPLOY_INFRA_TYPE),ecs)
  INFRA_SCRIPTS_DIR := prod_ecs
else ifeq ($(DEPLOY_INFRA_TYPE),eks)
  INFRA_SCRIPTS_DIR := prod_eks
else ifeq ($(DEPLOY_INFRA_TYPE),k8s)
  INFRA_SCRIPTS_DIR := local_k8s
endif

# Services list
SERVICES := ycode-backend ycampus-backend ylabs-backend yhub-backend ymarketplace-backend ycode-frontend ycampus-frontend ylabs-frontend ymarketplace-frontend code-executor

_validate-deploy:
	@if ! echo "$(VALID_DEPLOY_ENVS)" | grep -qw "$(DEPLOY_ENV)"; then \
		echo "❌ Invalid DEPLOY_ENV='$(DEPLOY_ENV)'. Must be one of: $(VALID_DEPLOY_ENVS)"; \
		exit 1; \
	fi
	@if ! echo "$(VALID_DEPLOY_INFRA_TYPES)" | grep -qw "$(DEPLOY_INFRA_TYPE)"; then \
		echo "❌ Invalid DEPLOY_INFRA_TYPE='$(DEPLOY_INFRA_TYPE)'. Must be one of: $(VALID_DEPLOY_INFRA_TYPES)"; \
		exit 1; \
	fi
	@echo "▶ DEPLOY_ENV=$(DEPLOY_ENV)  DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE)"

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
				if [ -f "ycode-executor-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ✓ ycode-executor-api/.env.$(DEPLOY_ENV)"; \
				else \
					echo "  ⚠ ycode-executor-api/.env.$(DEPLOY_ENV) not found"; \
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
				if [ ! -f "ycode-executor-api/.env.$(DEPLOY_ENV)" ]; then \
					echo "  ❌ Missing: ycode-executor-api/.env.$(DEPLOY_ENV)"; \
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
	@echo "Usage: [DEPLOY_ENV=local|dev|prod] [DEPLOY_INFRA_TYPE=local|ec2|ecs|eks] make <command>"
	@echo ""
	@echo "Environment:"
	@echo "  DEPLOY_ENV        local (default) | dev | prod"
	@echo "  DEPLOY_BRANCH     main (default) | any git branch"
	@echo "  DEPLOY_INFRA_TYPE local (default) | ec2 | ecs | eks"
	@echo ""
	@echo "Deployment Type (determined by DEPLOY_INFRA_TYPE):"
	@echo "  local → docker compose (Local Docker Compose)"
	@echo "  ec2   → docker (AWS EC2 with Docker)"
	@echo "  ecs   → ECS (AWS Elastic Container Service)"
	@echo "  eks   → kubernetes (AWS EKS or other Kubernetes)"
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
	@echo "  make install-ymarketplace Build and start YMarketplace services only"
	@echo "  make install-code-executor Build and start Code Executor only"
	@echo "  make run-ycode          Start YCode services (no build)"
	@echo "  make run-ycampus        Start YCampus services (no build)"
	@echo "  make stop-ycode         Stop YCode services"
	@echo "  make stop-ycampus       Stop YCampus services"
	@echo "  make logs-ycode         View YCode logs"
	@echo "  make logs-ycampus       View YCampus logs"
	@echo "  make setup-fixtures-data        Load fixture data for all apps"
	@echo "  make setup-fixtures-data-ycode  Load YCode fixture data"
	@echo "  make setup-fixtures-data-ycampus Load YCampus fixture data"
	@echo "  make setup-fixtures-data-yhub   Load YHub fixture data"
	@echo "  make setup-fixtures-data-ylabs  Load YLabs fixture data"
	@echo "  make setup-fixtures-data-ymarketplace Load YMarketplace fixture data"
	@echo "  make reload-fixtures-data       Clear and reload fixture data for all apps"
	@echo "  make reload-fixtures-data-ycode Clear and reload YCode fixture data"
	@echo "  make reload-fixtures-data-ycampus Clear and reload YCampus fixture data"
	@echo "  make reload-fixtures-data-yhub  Clear and reload YHub fixture data"
	@echo "  make reload-fixtures-data-ylabs Clear and reload YLabs fixture data"
	@echo "  make reload-fixtures-data-ymarketplace Clear and reload YMarketplace fixture data"
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
	@echo "  make db-reset-ymarketplace          Reset YMarketplace database only"
	@echo ""
	@echo "Per-App Dev Deploy (DEPLOY_BRANCH=<branch> make deploy-<app>):"
	@echo "  make deploy-infra               Deploy infrastructure (EKS, RDS, IAM) - PROD only"
	@echo "  make deploy                     Deploy all apps (Helm charts)"
	@echo "  make deploy-ycode                   Deploy YCode only"
	@echo "  make deploy-ycampus                 Deploy YCampus only"
	@echo "  make deploy-ylabs                   Deploy YLabs only"
	@echo "  make deploy-yhub                    Deploy YHub only"
	@echo "  make deploy-ymarketplace            Deploy YMarketplace only"
	@echo "  make deploy-code-executor           Deploy Code Executor only"
	@echo ""
	@echo "Image Build Commands (cache-friendly, BuildKit):"
	@echo "  make deployImages                   Build all images (from cache)"
	@echo "  make deployImages-ycode             Build YCode images only"
	@echo "  make deployImages-ycampus           Build YCampus images only"
	@echo "  make deployImages-ylabs             Build YLabs images only"
	@echo "  make deployImages-yhub              Build YHub images only"
	@echo "  make deployImages-ymarketplace      Build YMarketplace images only"
	@echo ""
	@echo "Examples:"
	@echo "  make install                                      # Start all (local + Docker Compose)"
	@echo "  DEPLOY_ENV=dev DEPLOY_INFRA_TYPE=ec2 make install # Deploy to AWS EC2 (Docker)"
	@echo "  DEPLOY_INFRA_TYPE=eks make install                # Deploy to EKS (Kubernetes)"
	@echo "  make install-ycode                                # Start YCode only"
	@echo "  DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs make install # Deploy to ECS (production)"
	@echo "  make observability-dev                            # Start observability stack"
	@echo "  make secrets-load                                 # Load secrets for environment"

# ============================================================================
# Deployment Commands (DEPLOY_INFRA_TYPE-specific)
# ============================================================================

ifeq ($(DEPLOY_INFRA_TYPE),local)
  # Docker Compose uses environment-specific compose files
  ENV_OVERRIDE := $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml)
  YMARKETPLACE_OVERRIDE := $(if $(filter dev,$(DEPLOY_ENV)),-f ymarketplace/docker-compose.dev.yml,-f ymarketplace/docker-compose.local.yml)
  COMPOSE_FILES := -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.ylabs.yml -f docker-compose.yhub.yml -f ymarketplace/docker-compose.yml $(YMARKETPLACE_OVERRIDE) $(ENV_OVERRIDE)
endif

install: _validate-deploy
	@echo "📦 Initializing submodules..."
	@git submodule update --init --remote --recursive
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
		echo "🚀 Deploying ALL services to AWS EC2 [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=ec2, BRANCH=$(DEPLOY_BRANCH)]..."; \
		echo ""; \
		bash infra/scripts/dev_ec2/deploy-common-apps.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ycode.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ycampus.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ylabs.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-yhub.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ymarketplace.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-code-executor.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building and starting all services [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=local]..."; \
		echo ""; \
		echo "📋 Creating external networks..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker network create yuvro_marketplace 2>/dev/null || true; \
		docker network create yuvro_yuvro-storage 2>/dev/null || true; \
		echo ""; \
		echo "🚀 Deploying common apps (executor, yhub, minio)..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-common-apps.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy common apps"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YCode..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ycode.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YCode"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YCampus..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ycampus.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YCampus"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YLabs..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ylabs.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YLabs"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YMarketplace..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ymarketplace.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YMarketplace"; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ All services deployed successfully!"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "🚀 Deploying to Kubernetes [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE)]..."; \
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
		echo "✅ Deployment initiated! Check status with: make status"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "🚀 Deploying to ECS [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		bash infra/scripts/prod_ecs/deploy-all.sh || true; \
	else \
		echo "❌ Unknown deployment infra type: $(DEPLOY_INFRA_TYPE)"; \
		exit 1; \
	fi

run: _validate-deploy
	@echo "📦 Initializing submodules..."
	@git submodule update --init --remote --recursive
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
		echo "🚀 Deploying ALL services to AWS EC2 [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=ec2, BRANCH=$(DEPLOY_BRANCH)]..."; \
		echo ""; \
		bash infra/scripts/dev_ec2/deploy-common-apps.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ycode.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ycampus.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ylabs.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-yhub.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-ymarketplace.sh $(DEPLOY_BRANCH) && \
		bash infra/scripts/dev_ec2/deploy-code-executor.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🚀 Starting all services [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=local]..."; \
		echo ""; \
		echo "📋 Creating external networks..."; \
		docker network create executor 2>/dev/null || true; \
		docker network create yuvro_ylabs 2>/dev/null || true; \
		docker network create yuvro_marketplace 2>/dev/null || true; \
		docker network create yuvro_yuvro-storage 2>/dev/null || true; \
		echo ""; \
		echo "🚀 Deploying common apps (executor, yhub, minio)..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-common-apps.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy common apps"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YCode..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ycode.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YCode"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YCampus..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ycampus.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YCampus"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YLabs..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ylabs.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YLabs"; \
			exit 1; \
		}; \
		echo ""; \
		echo "🚀 Deploying YMarketplace..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ymarketplace.sh $(DEPLOY_BRANCH) || { \
			echo "❌ Failed to deploy YMarketplace"; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ All services deployed successfully!"; \
		echo ""; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.ylabs.yml -f docker-compose.yhub.yml -f ymarketplace/docker-compose.yml ps 2>/dev/null || true; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YCode Frontend:    http://localhost:3000"; \
		echo "   YCode Backend:     http://localhost:8000"; \
		echo "   YCampus Frontend:  http://localhost:3001"; \
		echo "   YCampus Backend:   http://localhost:8001"; \
		echo "   YLabs Frontend:    http://localhost:3002"; \
		echo "   YLabs Backend:     http://localhost:8002"; \
		echo "   YHub Backend:      http://localhost:8003"; \
		echo "   YMarketplace Frontend: http://localhost:3004"; \
		echo "   YMarketplace Backend:  http://localhost:8004"; \
		echo "   Code Executor:     http://localhost:8009"; \
		echo ""; \
		echo "📺 Showing live logs. Press Ctrl+C to stop."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.ylabs.yml -f docker-compose.yhub.yml -f ymarketplace/docker-compose.yml logs -f; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "🚀 Deploying to Kubernetes [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE)]..."; \
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
		echo "✅ Deployment complete! Check status with: make status"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "🚀 Deploying to ECS [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		bash infra/scripts/prod_ecs/deploy-all.sh || true; \
	else \
		echo "❌ Unknown deployment infra type: $(DEPLOY_INFRA_TYPE)"; \
		exit 1; \
	fi

stop: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
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
	elif [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping all services..."; \
		docker compose $(COMPOSE_FILES) down; \
		echo "✅ All services stopped!"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling from Kubernetes..."; \
		helm uninstall yuvro --namespace yuvro 2>/dev/null || true; \
		echo "✅ Uninstall complete!"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "🛑 Stopping ECS deployment..."; \
		bash infra/scripts/prod_ecs/stop.sh || true; \
	fi

logs: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
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
	elif [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📝 Viewing logs from all services (Ctrl+C to exit)..."; \
		docker compose $(COMPOSE_FILES) logs -f; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing logs from all pods (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/part-of=yuvro -f 2>/dev/null || echo "No pods found"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "📝 Viewing ECS logs..."; \
		bash infra/scripts/prod_ecs/logs.sh || true; \
	fi

status: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "dev" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
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
	elif [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📊 Docker Compose status:"; \
		docker compose $(COMPOSE_FILES) ps; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "📊 Kubernetes deployment status:"; \
		kubectl get all -n yuvro 2>/dev/null || echo "No resources found"; \
		echo ""; \
		echo "📊 Namespaces:"; \
		kubectl get namespaces | grep -E "^yuvro|^ycode|^ycampus" || true; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "📊 ECS deployment status:"; \
		bash infra/scripts/prod_ecs/status.sh || true; \
	fi

port-forward: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
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
		echo "❌ port-forward is only available for DEPLOY_INFRA_TYPE=eks"; \
	fi

destroy: _validate-deploy
	@echo "🗑️  Destroying ALL containers and volumes [DEPLOY_ENV=$(DEPLOY_ENV), DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE)]..."
	@echo ""
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🧹 Stopping and removing all Docker containers and volumes..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml down -v --remove-orphans 2>/dev/null || true; \
		docker compose -f docker-compose.ycampus.yml down -v --remove-orphans 2>/dev/null || true; \
		docker compose -f docker-compose.ylabs.yml down -v --remove-orphans 2>/dev/null || true; \
		docker compose -f docker-compose.yhub.yml down -v --remove-orphans 2>/dev/null || true; \
		docker compose -f docker-compose.dev-ymarketplace.yml down -v --remove-orphans 2>/dev/null || true; \
		docker compose -f docker-compose.code-executor.yml down -v --remove-orphans 2>/dev/null || true; \
		docker system prune -f --volumes 2>/dev/null || true; \
		echo "✅ All Docker containers and volumes destroyed!"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
		echo "🧹 Destroying EC2 infrastructure [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		echo "⚠️  WARNING: This will terminate EC2 instances and release Elastic IPs"; \
		echo ""; \
		if [ -z "$$CI" ] && [ -z "$$TF_INPUT" ]; then \
			echo "To proceed with destruction, set environment variable:"; \
			echo "  export TF_INPUT=false"; \
			echo "Or run: TF_INPUT=false make destroy"; \
			echo ""; \
			echo "Skipping destruction in interactive mode for safety"; \
			exit 0; \
		fi; \
		echo "🛑 Destroying OpenTofu resources..."; \
		cd infra/opentofu/prod_ec2 && tofu destroy -auto-approve; cd ../../..; \
		echo "✅ EC2 infrastructure destroyed!"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "🧹 Destroying ECS infrastructure [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		echo "⚠️  WARNING: This will terminate ECS clusters and related resources"; \
		echo ""; \
		if [ -z "$$CI" ] && [ -z "$$TF_INPUT" ]; then \
			echo "To proceed with destruction, set environment variable:"; \
			echo "  export TF_INPUT=false"; \
			echo "Or run: TF_INPUT=false make destroy"; \
			echo ""; \
			echo "Skipping destruction in interactive mode for safety"; \
			exit 0; \
		fi; \
		echo "🛑 Destroying OpenTofu resources..."; \
		cd infra/opentofu/prod_ecs && tofu destroy -auto-approve; cd ../../..; \
		echo "✅ ECS infrastructure destroyed!"; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "🧹 Removing ALL Kubernetes resources..."; \
		helm uninstall yuvro --namespace yuvro 2>/dev/null || true; \
		kubectl delete namespace yuvro 2>/dev/null || true; \
		kubectl delete namespace yobservability 2>/dev/null || true; \
		kubectl delete namespace ycode 2>/dev/null || true; \
		kubectl delete namespace ycampus 2>/dev/null || true; \
		echo "✅ Kubernetes resources removed!"; \
		if [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] && [ "$(DEPLOY_ENV)" != "local" ]; then \
			echo ""; \
			echo "🧹 Destroying EKS infrastructure [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
			echo "⚠️  WARNING: This will destroy EKS cluster, VPC, and all related resources"; \
			echo ""; \
			if [ -z "$$CI" ] && [ -z "$$TF_INPUT" ]; then \
				echo "To proceed with destruction, set environment variable:"; \
				echo "  export TF_INPUT=false"; \
				echo "Or run: TF_INPUT=false make destroy"; \
				echo ""; \
				echo "Skipping infrastructure destruction in interactive mode for safety"; \
			else \
				echo "🛑 Destroying OpenTofu infrastructure..."; \
				cd infra/opentofu/prod_eks && tofu destroy -auto-approve; cd ../../..; \
				echo "✅ EKS infrastructure destroyed!"; \
			fi; \
		fi; \
	else \
		echo "❌ Unknown deployment infra type: $(DEPLOY_INFRA_TYPE)"; \
		exit 1; \
	fi

destroy-common-apps: _validate-deploy
	@echo "🗑️  Destroying common apps services [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🧹 Stopping common apps (executor, yhub, minio)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ Common apps destroyed!"; \
	else \
		echo "❌ destroy-common-apps is only available for local Docker deployment"; \
		exit 1; \
	fi

destroy-ycode: _validate-deploy
	@echo "🗑️  Destroying YCode services [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		docker compose -f docker-compose.ycode.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ YCode destroyed!"; \
	else \
		echo "❌ destroy-ycode is only available for local Docker deployment"; \
		exit 1; \
	fi

destroy-ycampus: _validate-deploy
	@echo "🗑️  Destroying YCampus services [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		docker compose -f docker-compose.ycampus.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ YCampus destroyed!"; \
	else \
		echo "❌ destroy-ycampus is only available for local Docker deployment"; \
		exit 1; \
	fi

destroy-ylabs: _validate-deploy
	@echo "🗑️  Destroying YLabs services [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		docker compose -f docker-compose.ylabs.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ YLabs destroyed!"; \
	else \
		echo "❌ destroy-ylabs is only available for local Docker deployment"; \
		exit 1; \
	fi

destroy-yhub: _validate-deploy
	@echo "🗑️  Destroying YHub services [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		docker compose -f docker-compose.yhub.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ YHub destroyed!"; \
	else \
		echo "❌ destroy-yhub is only available for local Docker deployment"; \
		exit 1; \
	fi

destroy-ymarketplace: _validate-deploy
	@echo "🗑️  Destroying YMarketplace services [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		docker compose -f docker-compose.dev-ymarketplace.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ YMarketplace destroyed!"; \
	else \
		echo "❌ destroy-ymarketplace is only available for local Docker deployment"; \
		exit 1; \
	fi

destroy-code-executor: _validate-deploy
	@echo "🗑️  Destroying Code Executor service [DEPLOY_ENV=$(DEPLOY_ENV)]..."
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		docker compose -f docker-compose.code-executor.yml down -v --remove-orphans 2>/dev/null || true; \
		echo "✅ Code Executor destroyed!"; \
	else \
		echo "❌ destroy-code-executor is only available for local Docker deployment"; \
		exit 1; \
	fi

# ============================================================================
# Platform-Specific Commands
# ============================================================================

install-ycode: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building YCode services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YCode services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
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
		echo "✅ YCode deployment initiated! Check status with: make status"; \
	fi

install-ycampus: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building YCampus services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YCampus services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
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
		echo "✅ YCampus deployment initiated! Check status with: make status"; \
	fi

run-ycode: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
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
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
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
		echo "✅ YCode deployment complete! Check status with: make status DEPLOY_INFRA_TYPE=k8s"; \
	fi

run-ycampus: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
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
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
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
		echo "✅ YCampus deployment complete! Check status with: make status DEPLOY_INFRA_TYPE=k8s"; \
	fi

stop-ycode: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping YCode services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling YCode from Kubernetes..."; \
		helm uninstall yuvro-code --namespace yuvro 2>/dev/null || true; \
		echo "✅ YCode uninstalled!"; \
	fi

stop-ycampus: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping YCampus services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "🛑 Uninstalling YCampus from Kubernetes..."; \
		helm uninstall yuvro-code --namespace yuvro 2>/dev/null || true; \
		echo "✅ YCampus uninstalled!"; \
	fi

logs-ycode: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📝 Viewing YCode logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing YCode Kubernetes logs (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/instance=yuvro-code -f 2>/dev/null || echo "No pods found"; \
	fi

logs-ycampus: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📝 Viewing YCampus logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ycampus.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "eks" ] || [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ]; then \
		echo "📝 Viewing YCampus Kubernetes logs (Ctrl+C to exit)..."; \
		kubectl logs -n yuvro -l app.kubernetes.io/instance=yuvro-code -f 2>/dev/null || echo "No pods found"; \
	fi

install-yhub: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building YHub services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YHub services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	else \
		echo "❌ Kubernetes deployment for YHub is not configured"; \
	fi

install-ylabs: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building YLabs services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YLabs services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) up; \
	else \
		echo "❌ Kubernetes deployment for YLabs is not configured"; \
	fi

install-ymarketplace: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building YMarketplace services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker network create yuvro_marketplace 2>/dev/null || true; \
		docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f ymarketplace/docker-compose.dev.yml,-f ymarketplace/docker-compose.yml) \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting YMarketplace services..."; \
		docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) up; \
	else \
		echo "❌ Kubernetes deployment for YMarketplace is not configured"; \
	fi

install-code-executor: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🔨 Building Code Executor [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose -f docker-compose.code-executor.yml \
			build --build-arg BUILDKIT_INLINE_CACHE=1; \
		echo "🚀 Starting Code Executor..."; \
		docker compose -f docker-compose.code-executor.yml up; \
	else \
		echo "❌ Kubernetes deployment for Code Executor is not configured"; \
	fi

run-yhub: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
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
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping YHub services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	fi

logs-yhub: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📝 Viewing YHub logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	fi

# YLabs
run-ylabs: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
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
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping YLabs services..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) down; \
	fi

logs-ylabs: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📝 Viewing YLabs logs (Ctrl+C to exit)..."; \
		docker compose -f docker-compose.yuvro.yml -f docker-compose.ylabs.yml $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev.yml,-f docker-compose.local.yml) logs -f; \
	fi

# YMarketplace
run-ymarketplace: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🚀 Starting YMarketplace services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker network create yuvro_marketplace 2>/dev/null || true; \
		docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) up -d --wait || { \
			echo "❌ One or more YMarketplace services failed to become healthy. Showing logs:"; \
			docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) ps; \
			docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) logs --tail=50; \
			exit 1; \
		}; \
		echo ""; \
		echo "✅ YMarketplace services are up and healthy!"; \
		echo ""; \
		docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) ps; \
		echo ""; \
		echo "🌐 Service URLs:"; \
		echo "   YMarketplace Frontend:  http://localhost:3004"; \
		echo "   YMarketplace Backend:   http://localhost:8004"; \
	else \
		echo "❌ Kubernetes run for YMarketplace is not configured"; \
	fi

stop-ymarketplace: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping YMarketplace services..."; \
		docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) down; \
	fi

logs-ymarketplace: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "📝 Viewing YMarketplace logs (Ctrl+C to exit)..."; \
		docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f docker-compose.dev-ymarketplace.yml,-f docker-compose.ymarketplace.yml -f docker-compose.local.yml) logs -f; \
	fi

# Code Executor
run-code-executor: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
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
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🛑 Stopping Code Executor..."; \
		docker compose -f docker-compose.code-executor.yml down; \
	fi

logs-code-executor: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
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

setup-fixtures-data-ymarketplace:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Loading fixtures for YMarketplace on EC2..."; \
		bash infra/scripts/runFixtures.sh ymarketplace; \
	else \
		$(MAKE) -f Makefile.ymarketplace load-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
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
		$(MAKE) -f Makefile.ymarketplace reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
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

reload-fixtures-data-ymarketplace:
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		echo "Reloading fixtures with clear for YMarketplace on EC2..."; \
		bash infra/scripts/runFixtures.sh ymarketplace --clear; \
	else \
		$(MAKE) -f Makefile.ymarketplace reload-fixtures-data DEPLOY_ENV=$(DEPLOY_ENV); \
	fi

clear-fixtures-data-ymarketplace: reload-fixtures-data-ymarketplace


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

makemigrations-ymarketplace:
	@$(MAKE) -f Makefile.ymarketplace db-makemigrations

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

db-reset-ymarketplace:
	@$(MAKE) -f Makefile.ymarketplace db-reset

# ============================================================================
# Per-App Dev Deploy Commands (DEPLOY_ENV=dev only)
# ============================================================================
# Infrastructure Provisioning (OpenTofu - EKS, RDS, etc.)
# ============================================================================

.PHONY: deploy-infra

deploy-infra: _validate-deploy
	@if [ "$(DEPLOY_INFRA_TYPE)" != "eks" ] && [ "$(DEPLOY_INFRA_TYPE)" != "ecs" ] && [ "$(DEPLOY_INFRA_TYPE)" != "ec2" ]; then \
		echo "❌ deploy-infra is only available for DEPLOY_INFRA_TYPE=eks, ecs, or ec2"; \
		echo "   Current: DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE)"; \
		exit 1; \
	fi
	@if [ "$(DEPLOY_ENV)" = "prod" ]; then \
		echo "🚀 Deploying Infrastructure to PRODUCTION [INFRA_TYPE=$(DEPLOY_INFRA_TYPE)]..."; \
		if [ "$(DEPLOY_INFRA_TYPE)" = "eks" ]; then \
			INFRA_DIR="prod_eks"; \
			echo "   This will provision: EKS cluster, RDS database (prod-yuvro-db), IAM roles, security groups, etc."; \
		elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
			INFRA_DIR="prod_ecs"; \
			echo "   This will provision: ECS cluster, RDS database (prod-yuvro-db), IAM roles, security groups, etc."; \
		elif [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
			INFRA_DIR="prod_ec2"; \
			echo "   This will provision: EC2 instance, RDS database (prod-yuvro-db), VPC, security groups, etc."; \
		fi; \
		echo ""; \
		cd infra/opentofu/$$INFRA_DIR && \
		tofu init && \
		echo "📋 Using infrastructure directory: $$INFRA_DIR"; \
		tofu plan -out=tfplan_prod && \
		echo ""; \
		echo "📋 Review the OpenTofu plan above carefully!"; \
		read -p "Do you want to apply this plan? (yes/no): " confirm; \
		if [ "$$confirm" = "yes" ]; then \
			echo "⏳ Applying infrastructure changes (this may take 15-30 minutes)..."; \
			TF_VARS=""; \
			if [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ] && [ ! -z "$(GITHUB_TOKEN)" ]; then \
				TF_VARS="-var github_token=$(GITHUB_TOKEN)"; \
			fi; \
			tofu apply $$TF_VARS -auto-approve tfplan_prod && \
			rm -f tfplan_prod; \
			echo ""; \
			echo "✅ Infrastructure deployment complete!"; \
			echo ""; \
			echo "📊 Infrastructure Outputs:"; \
			tofu output; \
			echo ""; \
			echo "Next steps:"; \
			if [ "$(DEPLOY_INFRA_TYPE)" = "eks" ]; then \
				echo "  1. Configure kubectl: aws eks update-kubeconfig --name yuvro-prod-cluster --region ap-south-1"; \
				echo "  2. Verify cluster: kubectl cluster-info"; \
			elif [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
				echo "  1. Verify ECS cluster: aws ecs describe-clusters --clusters yuvro-prod-ecs-cluster --region ap-south-1"; \
				echo "  2. Check services: aws ecs list-services --cluster yuvro-prod-ecs-cluster --region ap-south-1"; \
			elif [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
				echo "  1. Get EC2 IP: cd infra/opentofu/prod_ec2 && terraform output ec2_elastic_ips"; \
				echo "  2. Copy repo: scp -r -i key.pem . ubuntu@<IP>:/home/ubuntu/yuvro"; \
				echo "  3. SSH: ssh -i key.pem ubuntu@<IP>"; \
			fi; \
			echo "  4. Deploy apps: DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE) DEPLOY_BRANCH=$(DEPLOY_BRANCH) make deploy"; \
		else \
			echo "❌ Infrastructure deployment cancelled"; \
			rm -f tfplan_prod; \
			exit 1; \
		fi; \
		cd - > /dev/null; \
	else \
		echo "❌ Infrastructure provisioning (deploy-infra) is only available for DEPLOY_ENV=prod"; \
		echo "   Current: DEPLOY_ENV=$(DEPLOY_ENV)"; \
		exit 1; \
	fi

# ============================================================================
# App Deployment (Helm Charts - YCode, YCampus, YLabs, YHub, YMarketplace)
# ============================================================================

deploy: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "prod" ] && [ "$(DEPLOY_INFRA_TYPE)" = "eks" ]; then \
		echo "🚀 Deploying ALL apps to PRODUCTION EKS via Helm [branch=$(DEPLOY_BRANCH)]..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-all.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_ENV)" = "prod" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ecs" ]; then \
		echo "🚀 Deploying ALL apps to PRODUCTION ECS via Docker [branch=$(DEPLOY_BRANCH)]..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-all.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_ENV)" = "prod" ] && [ "$(DEPLOY_INFRA_TYPE)" = "ec2" ]; then \
		echo "🚀 Deploying ALL apps to PRODUCTION EC2 via Docker Compose [branch=$(DEPLOY_BRANCH)]..."; \
		bash infra/scripts/prod_ec2/deploy-all.sh $(DEPLOY_BRANCH); \
	elif [ "$(DEPLOY_INFRA_TYPE)" = "k8s" ] || [ "$(DEPLOY_INFRA_TYPE)" = "local" ]; then \
		echo "🚀 Deploying ALL apps to $(DEPLOY_ENV) [INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."; \
		bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-all.sh $(DEPLOY_BRANCH); \
	else \
		echo "❌ Unsupported deployment combination:"; \
		echo "   DEPLOY_ENV=$(DEPLOY_ENV)"; \
		echo "   DEPLOY_INFRA_TYPE=$(DEPLOY_INFRA_TYPE)"; \
		echo ""; \
		echo "Supported combinations:"; \
		echo "  • DEPLOY_ENV=local DEPLOY_INFRA_TYPE=local (Docker Compose)"; \
		echo "  • DEPLOY_ENV=local DEPLOY_INFRA_TYPE=k8s (Local Kubernetes)"; \
		echo "  • DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ec2 (AWS EC2 with Docker Compose)"; \
		echo "  • DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks (Production EKS)"; \
		echo "  • DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=ecs (Production ECS)"; \
		exit 1; \
	fi

# ============================================================================
# Infrastructure Provisioning (Legacy - Deprecated)
# ============================================================================

provision-infra:
	@echo "⚠️  provision-infra is deprecated. Use 'deploy-infra' instead."
	@echo "   make deploy-infra    - Plan infrastructure changes"
	@echo ""
	@echo "📦 Provisioning infrastructure [env=$(DEPLOY_ENV)]..."
	@bash infra/scripts/provision-infra.sh $(DEPLOY_ENV) plan

provision-infra-apply:
	@echo "⚠️  provision-infra-apply is deprecated. Use 'deploy-infra' instead."
	@echo ""
	@echo "📦 Provisioning & applying infrastructure [env=$(DEPLOY_ENV)]..."
	@bash infra/scripts/provision-infra.sh $(DEPLOY_ENV) apply

provision-infra-destroy:
	@echo "⚠️  provision-infra-destroy is deprecated."
	@echo ""
	@echo "⚠️  Destroying infrastructure [env=$(DEPLOY_ENV)]..."
	@bash infra/scripts/provision-infra.sh $(DEPLOY_ENV) destroy
deploy-ycode: _validate-deploy
	@echo "🚀 Deploying YCode [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ycode.sh $(DEPLOY_BRANCH)

deploy-common-apps: _validate-deploy
	@echo "🚀 Deploying Common Services [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-common-apps.sh $(DEPLOY_BRANCH)

deploy-ycampus: _validate-deploy
	@echo "🚀 Deploying YCampus [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ycampus.sh $(DEPLOY_BRANCH)

deploy-ylabs: _validate-deploy
	@echo "🚀 Deploying YLabs [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ylabs.sh $(DEPLOY_BRANCH)

deploy-yhub: _validate-deploy
	@echo "🚀 Deploying YHub [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-yhub.sh $(DEPLOY_BRANCH)

deploy-ymarketplace: _validate-deploy
	@echo "🚀 Deploying YMarketplace [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-ymarketplace.sh $(DEPLOY_BRANCH)

deploy-code-executor: _validate-deploy
	@echo "🚀 Deploying Code Executor [ENV=$(DEPLOY_ENV), INFRA_TYPE=$(DEPLOY_INFRA_TYPE), BRANCH=$(DEPLOY_BRANCH)]..."
	@bash infra/scripts/$(INFRA_SCRIPTS_DIR)/deploy-code-executor.sh $(DEPLOY_BRANCH)

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

deployImages-ymarketplace: _validate-deploy
	@echo "🐳 Building YMarketplace images (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose $(if $(filter dev,$(DEPLOY_ENV)),-f ymarketplace/docker-compose.dev.yml,-f ymarketplace/docker-compose.yml) \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		ymarketplace-backend ymarketplace-frontend
	@echo "✅ YMarketplace images built!"

deployImages-code-executor: _validate-deploy
	@echo "🐳 Building Code Executor image (layer cache preserved)..."
	@export CACHEBUST=$$(date +%s); \
	docker compose -f docker-compose.code-executor.yml \
		build --build-arg BUILDKIT_INLINE_CACHE=1 --build-arg CACHEBUST=$$CACHEBUST \
		yuvro-code-executor
	@echo "✅ Code Executor image built!"