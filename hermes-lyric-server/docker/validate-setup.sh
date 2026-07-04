#!/bin/bash
# Docker Setup Validation Script for HERMES
# Checks that all prerequisites and Docker setup is correct
#
# Usage: ./validate-setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# Helper functions
pass() {
    echo -e "${GREEN}[✓]${NC} $*"
    ((CHECKS_PASSED++))
}

fail() {
    echo -e "${RED}[✗]${NC} $*"
    ((CHECKS_FAILED++))
}

warn() {
    echo -e "${YELLOW}[!]${NC} $*"
    ((CHECKS_WARNED++))
}

info() {
    echo -e "${BLUE}[i]${NC} $*"
}

header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$*${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main checks
header "HERMES Docker Setup Validation"

echo ""
info "Running validation checks..."
echo ""

# =========================================================================
# System Prerequisites
# =========================================================================

header "1. System Prerequisites"

# Check OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    pass "Running on Linux/WSL"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    warn "Running on macOS (not officially tested on macOS)"
    CHECKS_WARNED=$((CHECKS_WARNED - 1))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    warn "Running on unknown OS: $OSTYPE"
fi

# Check disk space
DISK_FREE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$DISK_FREE" -ge 10 ]; then
    pass "Sufficient disk space: ${DISK_FREE}GB available"
else
    fail "Low disk space: only ${DISK_FREE}GB available (need at least 10GB)"
fi

# Check RAM
if [ -f /proc/meminfo ]; then
    TOTAL_RAM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_RAM_GB=$((TOTAL_RAM / 1024 / 1024))
    if [ "$TOTAL_RAM_GB" -ge 4 ]; then
        pass "Sufficient RAM: ${TOTAL_RAM_GB}GB available"
    else
        warn "Low RAM: only ${TOTAL_RAM_GB}GB available (recommend 8GB+)"
    fi
fi

# =========================================================================
# Docker Installation
# =========================================================================

header "2. Docker Installation"

# Check Docker command
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    pass "Docker installed: $DOCKER_VERSION"
else
    fail "Docker is not installed or not in PATH"
    fail "Install from: https://docker.com/products/docker-desktop"
fi

# Check Docker daemon
if docker ps &> /dev/null; then
    pass "Docker daemon is running"
else
    fail "Docker daemon is not running"
    fail "Start Docker Desktop or run: sudo systemctl start docker"
fi

# Check docker-compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    pass "docker-compose installed: $COMPOSE_VERSION"
else
    fail "docker-compose is not installed"
    fail "Install via Docker Desktop or: pip install docker-compose"
fi

# =========================================================================
# Project Structure
# =========================================================================

header "3. Project Structure"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")/.."

# Check key directories
if [ -d "$PROJECT_ROOT/monitor" ]; then
    pass "Found monitor directory"
else
    fail "Missing monitor directory: $PROJECT_ROOT/monitor"
fi

if [ -d "$PROJECT_ROOT/training" ]; then
    pass "Found training directory"
else
    fail "Missing training directory: $PROJECT_ROOT/training"
fi

# Check key files
if [ -f "$SCRIPT_DIR/Dockerfile" ]; then
    pass "Found Dockerfile"
else
    fail "Missing Dockerfile: $SCRIPT_DIR/Dockerfile"
fi

if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    pass "Found docker-compose.yml"
else
    fail "Missing docker-compose.yml: $SCRIPT_DIR/docker-compose.yml"
fi

if [ -f "$SCRIPT_DIR/.dockerignore" ]; then
    pass "Found .dockerignore"
else
    fail "Missing .dockerignore: $SCRIPT_DIR/.dockerignore"
fi

# Check dashboard_server.py
if [ -f "$PROJECT_ROOT/monitor/dashboard_server.py" ]; then
    pass "Found dashboard_server.py"
else
    fail "Missing dashboard_server.py: $PROJECT_ROOT/monitor/dashboard_server.py"
fi

# =========================================================================
# Configuration Files
# =========================================================================

header "4. Configuration Files"

if [ -f "$SCRIPT_DIR/.env" ]; then
    pass "Found .env file"
else
    warn ".env file not found (will use defaults from .env.example)"
    info "Run: cp .env.example .env"
fi

if [ -f "$SCRIPT_DIR/.env.example" ]; then
    pass "Found .env.example template"
else
    fail "Missing .env.example: $SCRIPT_DIR/.env.example"
fi

if [ -f "$SCRIPT_DIR/Makefile" ]; then
    pass "Found Makefile"
else
    fail "Missing Makefile: $SCRIPT_DIR/Makefile"
fi

# =========================================================================
# Docker Functionality
# =========================================================================

header "5. Docker Functionality"

# Test hello-world
if docker run --rm hello-world &> /dev/null; then
    pass "Docker can pull and run images"
else
    warn "Docker hello-world test failed (may indicate network issues)"
fi

# Check Docker API version
DOCKER_API=$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null || echo "unknown")
if [ "$DOCKER_API" != "unknown" ]; then
    pass "Docker API available: $DOCKER_API"
fi

# Check volume support
if docker volume create test-hermes-validate &> /dev/null; then
    docker volume rm test-hermes-validate &> /dev/null
    pass "Docker volume support working"
else
    fail "Docker volume support not working"
fi

# =========================================================================
# Network & Ports
# =========================================================================

header "6. Network & Ports"

# Check if ports are available
DASHBOARD_PORT=${DASHBOARD_PORT:-5000}
JUPYTER_PORT=${JUPYTER_PORT:-8888}

if netstat -tuln 2>/dev/null | grep ":$DASHBOARD_PORT " &> /dev/null; then
    warn "Port $DASHBOARD_PORT is already in use"
    info "Change DASHBOARD_PORT in .env to use a different port"
else
    pass "Port $DASHBOARD_PORT is available"
fi

if netstat -tuln 2>/dev/null | grep ":$JUPYTER_PORT " &> /dev/null; then
    warn "Port $JUPYTER_PORT is already in use"
    info "Change JUPYTER_PORT in .env to use a different port"
else
    pass "Port $JUPYTER_PORT is available"
fi

# Check internet connectivity
if curl -s --connect-timeout 2 https://hub.docker.com &> /dev/null; then
    pass "Internet connectivity working"
else
    warn "Cannot reach docker.com (may affect image pulls)"
fi

# =========================================================================
# Optional: GPU Support
# =========================================================================

header "7. GPU Support (Optional)"

if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo "")
    if [ -n "$GPU_INFO" ]; then
        pass "NVIDIA GPU detected: $GPU_INFO"

        # Check if GPU is available in Docker
        if docker run --rm --gpus all nvidia/cuda:11.8.0-runtime-ubuntu22.04 nvidia-smi &> /dev/null; then
            pass "GPU acceleration available in Docker"
        else
            warn "GPU available but not accessible in Docker"
            info "Enable in Docker Desktop: Settings → Resources → GPU"
        fi
    else
        warn "NVIDIA GPU not detected"
        info "GPU is optional; CPU mode will work fine"
    fi
else
    warn "nvidia-smi not found (GPU support not available)"
    info "GPU is optional for development"
fi

# =========================================================================
# Summary
# =========================================================================

header "Validation Summary"

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNED))

echo ""
echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNED"
echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
echo -e "Total:   $TOTAL"
echo ""

if [ "$CHECKS_FAILED" -eq 0 ]; then
    if [ "$CHECKS_WARNED" -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! Setup is ready to use.${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. cd $SCRIPT_DIR"
        echo "  2. make up-dev"
        echo "  3. Open http://localhost:5000"
        exit 0
    else
        echo -e "${YELLOW}⚠ Some warnings found but Docker should work.${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. cd $SCRIPT_DIR"
        echo "  2. make up-dev"
        echo "  3. Check logs if issues arise: make logs"
        exit 0
    fi
else
    echo -e "${RED}✗ Setup validation failed.${NC}"
    echo ""
    echo "Issues to resolve:"
    echo "  - Check failed items above (marked with [✗])"
    echo "  - Read: $SCRIPT_DIR/DOCKER_SETUP_GUIDE.md"
    echo "  - Or ask in your team channel"
    exit 1
fi
