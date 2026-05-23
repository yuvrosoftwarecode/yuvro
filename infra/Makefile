.PHONY: help localstack-up localstack-down localstack-logs localstack-clean \
        tofu-init tofu-plan tofu-apply tofu-destroy tofu-output tofu-validate \
        staging-plan staging-apply staging-destroy \
        prod-plan prod-apply prod-destroy

ENVIRONMENT ?= staging
REGION ?= us-east-1

help:
	@echo "YCode Infrastructure Management"
	@echo ""
	@echo "LocalStack Commands:"
	@echo "  make localstack-up          Start LocalStack services"
	@echo "  make localstack-down        Stop LocalStack services"
	@echo "  make localstack-logs        View LocalStack logs"
	@echo "  make localstack-clean       Remove LocalStack data"
	@echo ""
	@echo "OpenTofu Commands:"
	@echo "  make tofu-init              Initialize OpenTofu"
	@echo "  make tofu-validate          Validate OpenTofu configuration"
	@echo "  make tofu-plan              Plan infrastructure changes"
	@echo "  make tofu-apply             Apply infrastructure changes"
	@echo "  make tofu-destroy           Destroy infrastructure"
	@echo "  make tofu-output            Show infrastructure outputs"
	@echo ""
	@echo "Environment-specific Commands:"
	@echo "  make staging-plan           Plan staging deployment"
	@echo "  make staging-apply          Apply staging deployment"
	@echo "  make staging-destroy        Destroy staging infrastructure"
	@echo "  make prod-plan              Plan production deployment"
	@echo "  make prod-apply             Apply production deployment"
	@echo "  make prod-destroy           Destroy production infrastructure"
	@echo ""
	@echo "Variables:"
	@echo "  ENVIRONMENT=staging         Target environment (default: staging)"
	@echo "  REGION=us-east-1            AWS region (default: us-east-1)"

# LocalStack targets
localstack-up:
	@echo "Starting LocalStack services..."
	cd localstack && docker-compose up -d
	@echo "LocalStack is starting. UI available at http://localhost:4571"
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "LocalStack services started successfully!"

localstack-down:
	@echo "Stopping LocalStack services..."
	cd localstack && docker-compose down

localstack-logs:
	cd localstack && docker-compose logs -f localstack

localstack-clean:
	@echo "Removing LocalStack data..."
	cd localstack && docker-compose down -v
	rm -rf .localstack/

# OpenTofu targets
tofu-init:
	@echo "Initializing OpenTofu..."
	cd opentofu && tofu init

tofu-validate:
	@echo "Validating OpenTofu configuration..."
	cd opentofu && tofu validate

tofu-plan:
	@echo "Planning infrastructure changes for $(ENVIRONMENT)..."
	cd opentofu && tofu plan -var-file=$(ENVIRONMENT).tfvars -out=tfplan

tofu-apply:
	@echo "Applying infrastructure changes for $(ENVIRONMENT)..."
	cd opentofu && tofu apply tfplan

tofu-destroy:
	@echo "WARNING: This will destroy all infrastructure for $(ENVIRONMENT)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd opentofu && tofu destroy -var-file=$(ENVIRONMENT).tfvars; \
	fi

tofu-output:
	@echo "Infrastructure outputs for $(ENVIRONMENT):"
	cd opentofu && tofu output

tofu-fmt:
	@echo "Formatting OpenTofu files..."
	cd opentofu && tofu fmt -recursive

# Staging environment
staging-plan:
	@$(MAKE) tofu-plan ENVIRONMENT=staging

staging-apply:
	@$(MAKE) tofu-apply ENVIRONMENT=staging

staging-destroy:
	@$(MAKE) tofu-destroy ENVIRONMENT=staging

# Production environment
prod-plan:
	@$(MAKE) tofu-plan ENVIRONMENT=prod

prod-apply:
	@$(MAKE) tofu-apply ENVIRONMENT=prod

prod-destroy:
	@$(MAKE) tofu-destroy ENVIRONMENT=prod

# Utility targets
check-aws-credentials:
	@echo "Checking AWS credentials..."
	@aws sts get-caller-identity || (echo "AWS credentials not configured" && exit 1)

check-tofu:
	@command -v tofu >/dev/null 2>&1 || (echo "OpenTofu not installed" && exit 1)
	@echo "OpenTofu version: $$(tofu version)"

check-docker:
	@command -v docker >/dev/null 2>&1 || (echo "Docker not installed" && exit 1)
	@echo "Docker version: $$(docker --version)"

check-all: check-docker check-tofu check-aws-credentials
	@echo "All prerequisites are installed!"

# Development targets
dev-setup: check-all localstack-up tofu-init
	@echo "Development environment setup complete!"
	@echo "LocalStack UI: http://localhost:4571"
	@echo "Next steps:"
	@echo "  1. Configure AWS SDK for LocalStack"
	@echo "  2. Run: make tofu-plan"

dev-clean: localstack-clean
	@echo "Development environment cleaned!"
