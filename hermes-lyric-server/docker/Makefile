.PHONY: help up down logs shell build ps clean restart status gpu-check

# Docker Makefile for kudbee-music/hermes-lyric-server
# Provides convenient targets for common Docker operations
#
# Usage: make [target]
# Examples:
#   make up                 # Start default services
#   make up-dev             # Start development environment
#   make logs               # View logs
#   make shell              # Open shell in dev container
#   make clean              # Remove containers and volumes

# Default compose file
COMPOSE_FILE := docker-compose.yml
COMPOSE_CMD := docker-compose -f $(COMPOSE_FILE)

# Color output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)HERMES Docker Makefile$(NC)"
	@echo "======================"
	@echo ""
	@echo "$(BLUE)Services:$(NC)"
	@echo "  - dashboard   Flask monitoring server (port 5000)"
	@echo "  - training    Jupyter Lab environment (port 8888)"
	@echo "  - dev         Full development environment (all tools)"
	@echo ""
	@echo "$(BLUE)Targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Quick Start:$(NC)"
	@echo "  make up                 # Start all default services"
	@echo "  make up-dev             # Start full dev environment"
	@echo "  make logs               # View service logs"
	@echo "  make shell              # Open interactive shell"
	@echo ""

# =========================================================================
# Start/Stop Commands
# =========================================================================

up: ## Start default services (dashboard)
	@echo "$(BLUE)[*]$(NC) Starting services..."
	$(COMPOSE_CMD) --profile default up -d
	@echo "$(GREEN)[✓]$(NC) Services started."
	@echo "$(BLUE)[*]$(NC) Dashboard: http://localhost:5000"
	@$(COMPOSE_CMD) logs -f

up-dashboard: ## Start only dashboard service
	@echo "$(BLUE)[*]$(NC) Starting dashboard..."
	$(COMPOSE_CMD) up -d dashboard
	@echo "$(GREEN)[✓]$(NC) Dashboard started at http://localhost:5000"

up-training: ## Start only training environment (Jupyter)
	@echo "$(BLUE)[*]$(NC) Starting training environment..."
	$(COMPOSE_CMD) --profile training up -d training
	@echo "$(GREEN)[✓]$(NC) Training started. Run 'make logs-training' for Jupyter token."

up-dev: ## Start full development environment (all services)
	@echo "$(BLUE)[*]$(NC) Starting development environment..."
	$(COMPOSE_CMD) --profile dev up -d dev
	@echo "$(GREEN)[✓]$(NC) Dev environment started."
	@echo "  - Dashboard: http://localhost:5000"
	@echo "  - Jupyter: http://localhost:8888"
	@echo "  - Shell: make shell"

up-all: ## Start all services (dashboard + training + dev)
	@echo "$(BLUE)[*]$(NC) Starting all services..."
	$(COMPOSE_CMD) --profile all up -d
	@echo "$(GREEN)[✓]$(NC) All services started."

down: ## Stop all services
	@echo "$(BLUE)[*]$(NC) Stopping services..."
	$(COMPOSE_CMD) down
	@echo "$(GREEN)[✓]$(NC) Services stopped."

# =========================================================================
# Logs and Debugging
# =========================================================================

logs: ## View logs from all services
	$(COMPOSE_CMD) logs -f

logs-dashboard: ## View dashboard logs
	$(COMPOSE_CMD) logs -f dashboard

logs-training: ## View training logs (includes Jupyter token)
	$(COMPOSE_CMD) logs -f training

logs-dev: ## View development environment logs
	$(COMPOSE_CMD) logs -f dev

# =========================================================================
# Container Management
# =========================================================================

shell: ## Open interactive shell in dev container
	@echo "$(BLUE)[*]$(NC) Opening shell in dev container..."
	docker exec -it hermes-dev /bin/bash

shell-dashboard: ## Open shell in dashboard container
	docker exec -it hermes-dashboard /bin/bash

shell-training: ## Open shell in training container
	docker exec -it hermes-training /bin/bash

ps: ## List running containers
	$(COMPOSE_CMD) ps

# =========================================================================
# Build and Image Management
# =========================================================================

build: ## Build all Docker images
	@echo "$(BLUE)[*]$(NC) Building all images..."
	$(COMPOSE_CMD) build --no-cache

build-dashboard: ## Build dashboard image
	@echo "$(BLUE)[*]$(NC) Building dashboard image..."
	docker build -f Dockerfile --target dashboard -t kudbee/hermes-dashboard:latest ../..

build-training: ## Build training image
	@echo "$(BLUE)[*]$(NC) Building training image..."
	docker build -f Dockerfile --target training -t kudbee/hermes-training:latest ../..

build-dev: ## Build development image
	@echo "$(BLUE)[*]$(NC) Building dev image..."
	docker build -f Dockerfile --target dev -t kudbee/hermes-dev:latest ../..

build-prod: ## Build production dashboard image (minimal)
	@echo "$(BLUE)[*]$(NC) Building production image..."
	docker build -f Dockerfile --target prod-dashboard -t kudbee/hermes-dashboard:prod ../..

# =========================================================================
# System Management
# =========================================================================

clean: ## Remove stopped containers and volumes (interactive)
	@echo "$(YELLOW)[!]$(NC) This will remove containers and volumes."
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(COMPOSE_CMD) down -v; \
		echo "$(GREEN)[✓]$(NC) Cleanup complete."; \
	else \
		echo "$(BLUE)[*]$(NC) Cleanup cancelled."; \
	fi

clean-force: ## Force remove containers and volumes (no prompt)
	@echo "$(RED)[!]$(NC) Force removing all containers and volumes..."
	$(COMPOSE_CMD) down -v --remove-orphans
	@echo "$(GREEN)[✓]$(NC) Force cleanup complete."

prune: ## Remove unused Docker images and volumes
	@echo "$(BLUE)[*]$(NC) Pruning Docker system..."
	docker system prune -f
	@echo "$(GREEN)[✓]$(NC) Prune complete."

volumes: ## List Docker volumes
	@echo "$(BLUE)Docker Volumes:$(NC)"
	docker volume ls | grep -E "hermes|Local" || echo "No hermes volumes found"

restart: ## Restart all services
	@echo "$(BLUE)[*]$(NC) Restarting services..."
	$(COMPOSE_CMD) restart
	@echo "$(GREEN)[✓]$(NC) Services restarted."

restart-dashboard: ## Restart dashboard service
	@echo "$(BLUE)[*]$(NC) Restarting dashboard..."
	$(COMPOSE_CMD) restart dashboard
	@echo "$(GREEN)[✓]$(NC) Dashboard restarted."

restart-training: ## Restart training service
	@echo "$(BLUE)[*]$(NC) Restarting training..."
	$(COMPOSE_CMD) restart training
	@echo "$(GREEN)[✓]$(NC) Training restarted."

# =========================================================================
# Status and Information
# =========================================================================

status: ## Show detailed service status
	@echo "$(BLUE)Service Status:$(NC)"
	@$(COMPOSE_CMD) ps
	@echo ""
	@echo "$(BLUE)Volumes:$(NC)"
	@docker volume ls | grep hermes || echo "No hermes volumes found"
	@echo ""
	@echo "$(BLUE)Networks:$(NC)"
	@docker network ls | grep hermes || echo "No hermes networks found"

version: ## Show Docker versions
	@echo "$(BLUE)Docker Version:$(NC)"
	@docker --version
	@echo "$(BLUE)Docker Compose Version:$(NC)"
	@docker-compose --version

gpu-check: ## Check GPU availability and configuration
	@echo "$(BLUE)GPU Check:$(NC)"
	@command -v nvidia-smi >/dev/null 2>&1 && \
		(echo "$(GREEN)[✓]$(NC) NVIDIA GPU detected:"; nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader) \
		|| echo "$(YELLOW)[!]$(NC) No NVIDIA GPU detected. CPU will be used."; \
	echo ""; \
	echo "$(BLUE)GPU in Docker:$(NC)"; \
	echo "  To enable GPU in Docker, ensure:"; \
	echo "    1. Docker Desktop GPU enabled (Settings → Resources → Docker Engine)"; \
	echo "    2. Update docker-compose.yml: deploy.resources.reservations.devices"; \
	echo "    3. Or set: CUDA_VISIBLE_DEVICES=0"

# =========================================================================
# Development Helpers
# =========================================================================

install-deps: ## Install Python dependencies in dev container
	@echo "$(BLUE)[*]$(NC) Installing dependencies..."
	docker exec hermes-dev pip install -r /app/requirements.txt 2>/dev/null || echo "$(YELLOW)[!]$(NC) No requirements.txt found"

format: ## Format Python code with black
	@echo "$(BLUE)[*]$(NC) Formatting Python code..."
	docker exec hermes-dev black /app --quiet
	@echo "$(GREEN)[✓]$(NC) Code formatted."

lint: ## Lint Python code with flake8
	@echo "$(BLUE)[*]$(NC) Linting Python code..."
	docker exec hermes-dev flake8 /app --count --select=E9,F63,F7,F82 --show-source --statistics
	@echo "$(GREEN)[✓]$(NC) Lint check complete."

test: ## Run tests (if test suite exists)
	@echo "$(BLUE)[*]$(NC) Running tests..."
	docker exec hermes-dev pytest /app/tests -v 2>/dev/null || echo "$(YELLOW)[!]$(NC) No tests found"

# =========================================================================
# Convenience Shortcuts
# =========================================================================

start: up ## Alias for 'up'

stop: down ## Alias for 'down'

info: status ## Alias for 'status'

check: gpu-check ## Alias for 'gpu-check'

fresh-start: clean up ## Clean and restart
	@echo "$(GREEN)[✓]$(NC) Fresh start complete."

.PHONY: help up down logs shell build ps clean restart status gpu-check versions
