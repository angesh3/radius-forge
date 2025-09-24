# RadiusForge Makefile - Command Targets mapped to Multi-Agent Orchestration
# Each target corresponds to a command in the Command Palette (CLAUDE.md)

SHELL := /bin/bash
.PHONY: help install dev test clean build deploy all

# Variables
PYTHON := python3
PIP := pip3
NPM := npm
DOCKER := docker
DOCKER_COMPOSE := docker-compose
ORCHESTRATOR := .claude/orchestrator.py

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

# Default target
help:
	@echo "RadiusForge - Multi-Agent Orchestration Commands"
	@echo "================================================"
	@echo ""
	@echo "🎯 Agent Commands (mapped to Command Palette):"
	@echo "  make triage ARG=\"request\"    - Clarify requirements and ACs"
	@echo "  make design                  - Create UX flows and wireframes"
	@echo "  make arch                    - Define technical architecture"
	@echo "  make dev-be COMP=\"component\" - Implement backend component"
	@echo "  make dev-fe COMP=\"component\" - Implement frontend component"
	@echo "  make sec-scan                - Security assessment"
	@echo "  make test-unit               - Run unit tests"
	@echo "  make test-int                - Run integration tests"
	@echo "  make test-e2e                - Run end-to-end tests"
	@echo "  make test-report             - Generate unified test report"
	@echo "  make review                  - Code review"
	@echo "  make docs                    - Update documentation"
	@echo "  make bundle                  - Create deployment bundle"
	@echo "  make handoff                 - Final delivery"
	@echo ""
	@echo "🔧 Orchestrator Commands:"
	@echo "  make plan ARG=\"feature\"      - Create execution plan"
	@echo "  make status                  - Check project status"
	@echo "  make rollback VER=\"version\"  - Rollback to version"
	@echo ""
	@echo "🚀 Development Commands:"
	@echo "  make install                 - Install all dependencies"
	@echo "  make dev                     - Start development servers"
	@echo "  make build                   - Build production artifacts"
	@echo "  make clean                   - Clean generated files"
	@echo "  make docker-up               - Start Docker services"
	@echo "  make docker-down             - Stop Docker services"

# =============================================================================
# Multi-Agent Orchestration Commands (Command Palette)
# =============================================================================

triage:
	@echo "$(GREEN)→ /triage: Clarifying requirements...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /triage "$(ARG)"

design:
	@echo "$(GREEN)→ /design: Creating UX flows and wireframes...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /design

arch:
	@echo "$(GREEN)→ /arch: Defining technical architecture...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /arch

dev-be:
	@echo "$(GREEN)→ /dev-be: Implementing backend component...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /dev-be "$(COMP)"

dev-fe:
	@echo "$(GREEN)→ /dev-fe: Implementing frontend component...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /dev-fe "$(COMP)"

sec-scan:
	@echo "$(GREEN)→ /sec-scan: Running security assessment...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /sec-scan
	@echo "Running SAST scan..."
	@bandit -r src/ || true
	@echo "Checking dependencies..."
	@safety check || true

test-unit:
	@echo "$(GREEN)→ /test-unit: Running unit tests...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /test-unit
	@cd src && $(PYTHON) -m pytest tests/unit -v --cov=. --cov-report=html

test-int:
	@echo "$(GREEN)→ /test-int: Running integration tests...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /test-int
	@cd src && $(PYTHON) -m pytest tests/integration -v

test-e2e:
	@echo "$(GREEN)→ /test-e2e: Running end-to-end tests...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /test-e2e
	@cd ui && $(NPM) run test:e2e

test-report:
	@echo "$(GREEN)→ /test-report: Generating unified test report...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /test-report
	@$(PYTHON) ops/generate_test_report.py

review:
	@echo "$(GREEN)→ /review: Running code review...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /review
	@echo "Running linters..."
	@cd ui && $(NPM) run lint
	@cd src && flake8 . || true
	@cd src && mypy . || true

docs:
	@echo "$(GREEN)→ /docs: Updating documentation...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /docs
	@$(PYTHON) ops/generate_docs.py

bundle:
	@echo "$(GREEN)→ /bundle: Creating deployment bundle...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /bundle
	@make build
	@$(PYTHON) ops/create_bundle.py

handoff:
	@echo "$(GREEN)→ /handoff: Final delivery...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /handoff

# =============================================================================
# Orchestrator Management Commands
# =============================================================================

plan:
	@echo "$(YELLOW)→ /plan: Creating execution plan...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /plan "$(ARG)"

status:
	@echo "$(YELLOW)→ /status: Checking project status...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /status

rollback:
	@echo "$(YELLOW)→ /rollback: Rolling back to version $(VER)...$(NC)"
	@$(PYTHON) $(ORCHESTRATOR) /rollback "$(VER)"

# =============================================================================
# Development Commands
# =============================================================================

install: install-backend install-frontend install-tools
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

install-backend:
	@echo "Installing Python dependencies..."
	@$(PIP) install -r requirements.txt

install-frontend:
	@echo "Installing Node dependencies..."
	@cd ui && $(NPM) install

install-tools:
	@echo "Installing development tools..."
	@$(PIP) install bandit safety flake8 mypy black pytest-cov

dev:
	@echo "$(GREEN)Starting development servers...$(NC)"
	@make -j2 dev-backend dev-frontend

dev-backend:
	@echo "Starting FastAPI backend on port 8910..."
	@cd src && uvicorn api.main:app --reload --host 0.0.0.0 --port 8910

dev-frontend:
	@echo "Starting React frontend..."
	@cd ui && $(NPM) run dev

build: build-frontend build-backend
	@echo "$(GREEN)✓ Build complete$(NC)"

build-frontend:
	@echo "Building React frontend..."
	@cd ui && $(NPM) run build

build-backend:
	@echo "Building Python package..."
	@$(PYTHON) setup.py sdist bdist_wheel

# =============================================================================
# Docker Commands
# =============================================================================

docker-up:
	@echo "Starting Docker services..."
	@$(DOCKER_COMPOSE) up -d

docker-down:
	@echo "Stopping Docker services..."
	@$(DOCKER_COMPOSE) down

docker-logs:
	@$(DOCKER_COMPOSE) logs -f

# =============================================================================
# Database Commands
# =============================================================================

db-migrate:
	@echo "Running database migrations..."
	@cd src && alembic upgrade head

db-rollback:
	@echo "Rolling back database..."
	@cd src && alembic downgrade -1

db-reset:
	@echo "Resetting database..."
	@cd src && alembic downgrade base && alembic upgrade head

# =============================================================================
# Testing Pipeline (for CI)
# =============================================================================

test: test-unit test-int test-e2e test-report
	@echo "$(GREEN)✓ All tests complete$(NC)"

ci: install lint test build
	@echo "$(GREEN)✓ CI pipeline complete$(NC)"

lint:
	@echo "Running linters..."
	@make review

# =============================================================================
# Cleanup Commands
# =============================================================================

clean: clean-python clean-node clean-build
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-python:
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@rm -rf .pytest_cache
	@rm -rf htmlcov
	@rm -rf .coverage

clean-node:
	@rm -rf ui/node_modules
	@rm -rf ui/dist
	@rm -rf ui/.parcel-cache

clean-build:
	@rm -rf build
	@rm -rf dist
	@rm -rf *.egg-info
	@rm -rf release/*.tar.gz

# =============================================================================
# Utility Commands
# =============================================================================

format:
	@echo "Formatting code..."
	@black src/
	@cd ui && $(NPM) run format

check-deps:
	@echo "Checking dependencies..."
	@pip-audit || true
	@cd ui && $(NPM) audit

version:
	@echo "RadiusForge Version:"
	@cat VERSION || echo "1.0.0"

# =============================================================================
# Special Targets
# =============================================================================

.DEFAULT_GOAL := help

all: install lint test build bundle
	@echo "$(GREEN)✓ Full pipeline complete$(NC)"

# Prevent make from trying to remake the Makefile
Makefile: ;