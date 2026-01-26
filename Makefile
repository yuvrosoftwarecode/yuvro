.PHONY: help dev dev-detached stop restart logs setup clean rebuild
.PHONY: db-shell db-migrate db-makemigrations db-reset
.PHONY: ycampus-db-shell ycampus-db-migrate ycampus-db-makemigrations ycampus-db-reset
.PHONY: backend-shell backend-test backend-format backend-format-fix backend-lint backend-install
.PHONY: ycampus-backend-shell ycampus-backend-test ycampus-backend-format ycampus-backend-format-fix ycampus-backend-lint ycampus-backend-install
.PHONY: frontend-shell frontend-test frontend-test-watch frontend-format frontend-format-fix frontend-lint frontend-install
.PHONY: ycampus-frontend-shell ycampus-frontend-test ycampus-frontend-test-watch ycampus-frontend-format ycampus-frontend-format-fix ycampus-frontend-lint ycampus-frontend-install
.PHONY: test-all format-all lint-all check-all
.PHONY: prod-build prod-up prod-down
.PHONY: observability-setup observability-start observability-stop observability-logs observability-dashboards

help:
	@echo "YC Full-Stack Application Commands"
	@echo ""
	@echo "Development (Standard):"
	@echo "  dev                 Start all services"
	@echo "  dev-detached        Start all services in background"
	@echo "  stop                Stop all services"
	@echo "  restart             Restart all services"
	@echo "  logs [SERVICE]      View logs (optional service name)"
	@echo ""
	@echo "Development (Debug/Observability):"
	@echo "  debug               Start all services with observability enabled"
	@echo "  debug-detached      Start all services with observability in background"
	@echo "  debug-stop          Stop all debug services"
	@echo "  debug-build         Rebuild and start debug services"
	@echo ""
	@echo "Setup and cleanup:"
	@echo "  setup               Initial project setup"
	@echo "  reload-data          Reset and reload test data"
	@echo "  clean               Clean up containers and volumes"
	@echo ""
	@echo "Database operations:"
	@echo "  db-shell            Access database shell"
	@echo "  db-migrate          Run Django migrations"
	@echo "  db-makemigrations   Create Django migrations"
	@echo "  db-reset            Reset database"
	@echo ""
	@echo "YCampus Database operations:"
	@echo "  ycampus-db-shell    Access ycampus database shell"
	@echo "  ycampus-db-migrate  Run ycampus Django migrations"
	@echo "  ycampus-db-makemigrations Create ycampus Django migrations"
	@echo "  ycampus-db-reset    Reset ycampus database"
	@echo ""
	@echo "Backend commands:"
	@echo "  backend-shell       Django shell"
	@echo "  backend-test        Run backend tests"
	@echo "  backend-format      Check backend code formatting"
	@echo "  backend-format-fix  Fix backend code formatting"
	@echo "  backend-lint        Lint backend code"
	@echo "  backend-install PKG Install backend package"
	@echo ""
	@echo "YCampus Backend commands:"
	@echo "  ycampus-backend-shell Django shell"
	@echo "  ycampus-backend-test  Run ycampus backend tests"
	@echo "  ycampus-backend-format Check ycampus backend code formatting"
	@echo "  ycampus-backend-format-fix Fix ycampus backend code formatting"
	@echo "  ycampus-backend-lint  Lint ycampus backend code"
	@echo "  ycampus-backend-install PKG Install ycampus backend package"
	@echo ""
	@echo "Code Executor commands:"
	@echo "  executor-shell      Code executor shell"
	@echo "  executor-test       Test code executor service"
	@echo "  executor-logs       View code executor logs"
	@echo ""
	@echo "Frontend commands:"
	@echo "  frontend-shell      Node.js shell"
	@echo "  frontend-test       Run frontend tests"
	@echo "  frontend-test-watch Run frontend tests in watch mode"
	@echo "  frontend-format     Check frontend code formatting"
	@echo "  frontend-format-fix Fix frontend code formatting"
	@echo "  frontend-lint       Lint frontend code"
	@echo "  frontend-install PKG Install frontend package"
	@echo ""
	@echo "YCampus Frontend commands:"
	@echo "  ycampus-frontend-shell Node.js shell"
	@echo "  ycampus-frontend-test  Run ycampus frontend tests"
	@echo "  ycampus-frontend-test-watch Run ycampus frontend tests in watch mode"
	@echo "  ycampus-frontend-format Check ycampus frontend code formatting"
	@echo "  ycampus-frontend-format-fix Fix ycampus frontend code formatting"
	@echo "  ycampus-frontend-lint  Lint ycampus frontend code"
	@echo "  ycampus-frontend-install PKG Install ycampus frontend package"
	@echo ""
	@echo "Combined operations:"
	@echo "  test-all            Run all tests"
	@echo "  format-all          Format all code"
	@echo "  lint-all            Lint all code"
	@echo "  check-all           Run all checks"
	@echo ""
	@echo "Observability Utilities:"
	@echo "  observability-setup Setup observability stack"
	@echo "  observability-logs  View observability logs"
	@echo "  observability-dashboards Open dashboards in browser"
	@echo ""
	@echo "Production commands:"
	@echo "  prod-build          Build production images"
	@echo "  prod-up             Start production services"
	@echo "  prod-down           Stop production services"

build:
	docker compose up --build

dev:
	docker compose up

dev-detached:
	docker compose up --build -d

stop:
	docker compose down

restart:
	docker compose restart

debug:
	docker compose -f docker-compose.yml -f docker-compose.debug.yml up

debug-detached:
	docker compose -f docker-compose.yml -f docker-compose.debug.yml up --build -d

debug-build:
	docker compose -f docker-compose.yml -f docker-compose.debug.yml up --build

debug-stop:
	docker compose -f docker-compose.yml -f docker-compose.debug.yml down

logs:
	@if [ "$(SERVICE)" = "" ]; then \
		docker compose logs -f; \
	else \
		docker compose logs -f $(SERVICE); \
	fi

setup:
	@echo "Setting up YC Full-Stack Application..."
	@echo "Checking dependencies..."
	@command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Please install Docker first."; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Please install Docker Compose first."; exit 1; }

	@echo "Creating environment files..."
	@if [ ! -f yc-backend-api/.env ]; then cp yc-backend-api/.env.example yc-backend-api/.env; echo "Created backend .env"; fi
	@if [ ! -f yc-web/.env ]; then cp yc-web/.env.example yc-web/.env; echo "Created frontend .env"; fi
	@if [ ! -f yc-code-executor/.env ]; then cp yc-code-executor/.env.example yc-code-executor/.env; echo "Created code-executor .env"; fi
	@if [ ! -f ycampus-backend-api/.env ]; then cp ycampus-backend-api/.env.example ycampus-backend-api/.env; echo "Created ycampus-backend .env"; fi
	@if [ ! -f ycampus-web/.env ]; then cp ycampus-web/.env.example ycampus-web/.env; echo "Created ycampus-frontend .env"; fi


	@echo "Building and starting services..."
	docker compose down -v --remove-orphans
	docker compose up -d --build --wait

	@echo "Waiting for backend to be ready..."
	@sleep 5

	@echo "Running initial setup and migrations..."
	docker compose exec backend python manage.py migrate
	docker compose exec backend python manage.py setup_local_testing --clear
	docker compose exec ycampus-backend python manage.py migrate
	docker compose exec ycampus-backend python manage.py setup_local_testing --clear
	
	@echo "Setup complete! The application is running."
	@echo "YC Frontend: http://localhost:3000"
	@echo "YC Backend API: http://localhost:8001"
	@echo "YCampus Frontend: http://localhost:3002"
	@echo "YCampus Backend API: http://localhost:8003"
	@echo "Run 'make build' if requirements or libraries are updated."
	@echo "Run 'make logs' to monitor the services."
	@echo "Run 'make reload-data' to reload test data."
	@echo "Run 'make run' to start the services."

reload-data:
	@echo "Resetting and reloading test data..."
	docker compose exec backend python manage.py setup_local_testing --clear
	docker compose exec ycampus-backend python manage.py setup_local_testing --clear

clean:
	docker compose down -v --remove-orphans
	docker system prune -f


db-shell:
	docker compose exec db psql -U postgres -d yc_app

db-migrate:
	docker compose exec backend python manage.py migrate

db-makemigrations:
	docker compose exec backend python manage.py makemigrations

db-createsuperuser:
	docker compose exec backend python manage.py createsuperuser

db-reset:
	@echo "Resetting database to initial state..."
	docker compose down -v
	docker compose up -d db

# YCampus Database operations
ycampus-db-shell:
	docker compose exec ycampus-db psql -U postgres -d yc_app

ycampus-db-migrate:
	docker compose exec ycampus-backend python manage.py migrate

ycampus-db-makemigrations:
	docker compose exec ycampus-backend python manage.py makemigrations

ycampus-db-createsuperuser:
	docker compose exec ycampus-backend python manage.py createsuperuser

ycampus-db-reset:
	@echo "Resetting ycampus database to initial state..."
	docker compose down ycampus-db -v
	docker compose up -d ycampus-db

backend-shell:
	docker compose exec backend python manage.py shell

backend-test:
	docker compose exec backend python manage.py test

backend-format:
	docker compose exec backend black . --check --diff

backend-format-fix:
	docker compose exec backend black .

backend-lint:
	docker compose exec backend flake8 .

backend-install:
	@if [ "$(PKG)" = "" ]; then \
		echo "Usage: make backend-install PKG=package-name"; \
		exit 1; \
	fi
	docker compose exec backend pip install $(PKG)
	docker compose exec backend pip freeze > requirements.txt

# YCampus Backend commands
ycampus-backend-shell:
	docker compose exec ycampus-backend python manage.py shell

ycampus-backend-test:
	docker compose exec ycampus-backend python manage.py test

ycampus-backend-format:
	docker compose exec ycampus-backend black . --check --diff

ycampus-backend-format-fix:
	docker compose exec ycampus-backend black .

ycampus-backend-lint:
	docker compose exec ycampus-backend flake8 .

ycampus-backend-install:
	@if [ "$(PKG)" = "" ]; then \
		echo "Usage: make ycampus-backend-install PKG=package-name"; \
		exit 1; \
	fi
	docker compose exec ycampus-backend pip install $(PKG)
	docker compose exec ycampus-backend pip freeze > requirements.txt

frontend-shell:
	docker compose exec frontend sh

frontend-test:
	docker compose exec frontend npm test -- --run

frontend-test-watch:
	docker compose exec frontend npm test

frontend-format:
	docker compose exec frontend npm run format:check

frontend-format-fix:
	docker compose exec frontend npm run format

frontend-lint:
	docker compose exec frontend npm run lint

frontend-install:
	@if [ "$(PKG)" = "" ]; then \
		echo "Usage: make frontend-install PKG=package-name"; \
		exit 1; \
	fi
	docker compose exec frontend npm install $(PKG)

# YCampus Frontend commands
ycampus-frontend-shell:
	docker compose exec ycampus-frontend sh

ycampus-frontend-test:
	docker compose exec ycampus-frontend npm test -- --run

ycampus-frontend-test-watch:
	docker compose exec ycampus-frontend npm test

ycampus-frontend-format:
	docker compose exec ycampus-frontend npm run format:check

ycampus-frontend-format-fix:
	docker compose exec ycampus-frontend npm run format

ycampus-frontend-lint:
	docker compose exec ycampus-frontend npm run lint

ycampus-frontend-install:
	@if [ "$(PKG)" = "" ]; then \
		echo "Usage: make ycampus-frontend-install PKG=package-name"; \
		exit 1; \
	fi
	docker compose exec ycampus-frontend npm install $(PKG)

executor-shell:
	docker compose exec code-executor sh

executor-test:
	docker compose exec code-executor python test_service.py

executor-logs:
	docker compose logs -f code-executor

test-all:
	@echo "Running backend tests..."
	$(MAKE) backend-test
	@echo "Running frontend tests..."
	$(MAKE) frontend-test

format-all:
	@echo "Formatting backend code..."
	$(MAKE) backend-format-fix
	@echo "Formatting frontend code..."
	$(MAKE) frontend-format-fix

lint-all:
	@echo "Linting backend code..."
	$(MAKE) backend-lint
	@echo "Linting frontend code..."
	$(MAKE) frontend-lint

check-all:
	@echo "Running all checks..."
	$(MAKE) backend-format
	$(MAKE) backend-lint
	$(MAKE) frontend-format
	$(MAKE) frontend-lint
	$(MAKE) test-all

observability-setup:
	@echo "🚀 Setting up observability stack..."
	./yc-observability/setup.sh

observability-logs:
	@echo "📋 Viewing observability logs..."
	docker compose -f docker-compose.yml -f docker-compose.debug.yml logs -f jaeger otel-collector prometheus grafana

observability-dashboards:
	@echo "🌐 Opening observability dashboards..."
	@echo "Grafana: http://localhost:3001 (admin/admin)"
	@echo "Jaeger: http://localhost:16686"
	@echo "Prometheus: http://localhost:9090"
	@if command -v open >/dev/null 2>&1; then \
		open http://localhost:3001 & \
		open http://localhost:16686 & \
		open http://localhost:9090 & \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:3001 & \
		xdg-open http://localhost:16686 & \
		xdg-open http://localhost:9090 & \
	else \
		echo "Please open the URLs manually in your browser"; \
	fi


prod-build:
	docker compose -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down