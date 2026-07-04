#!/bin/bash
# Docker entrypoint script with convenience utilities
# Provides easy access to common Docker tasks for kudbee-music development
#
# Usage:
#   ./docker/docker-entrypoint.sh <command> [args]
#
# Commands:
#   up [service]           Start services (default: all)
#   down                   Stop all services
#   logs [service]         View logs (default: all)
#   shell [service]        Interactive shell in container
#   build [target]         Build Docker image
#   ps                     List running containers
#   clean                  Remove containers and volumes
#   restart [service]      Restart service(s)
#   status                 Show service status
#   gpu-check              Check GPU availability
#   help                   Show this help message

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")/.."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed. Please install Docker Desktop (includes docker-compose)."
        exit 1
    fi
}

# Change to docker directory for compose commands
cd "$SCRIPT_DIR"

# Main command handling
case "${1:-help}" in
    up)
        check_docker
        SERVICE=${2:-}
        log_info "Starting services${SERVICE:+ ($SERVICE)}..."
        if [ -z "$SERVICE" ]; then
            docker-compose --profile default up -d
            log_success "Services started in background."
            log_info "Access dashboard at http://localhost:5000"
            docker-compose logs -f
        else
            docker-compose up -d "$SERVICE"
            log_success "Service '$SERVICE' started."
            docker-compose logs -f "$SERVICE"
        fi
        ;;

    down)
        check_docker
        log_info "Stopping all services..."
        docker-compose down
        log_success "Services stopped."
        ;;

    logs)
        check_docker
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            log_info "Showing logs from all services..."
            docker-compose logs -f
        else
            log_info "Showing logs from '$SERVICE'..."
            docker-compose logs -f "$SERVICE"
        fi
        ;;

    shell)
        check_docker
        SERVICE=${2:-dev}
        CONTAINER_NAME="hermes-${SERVICE}"
        log_info "Opening shell in $CONTAINER_NAME..."
        docker exec -it "$CONTAINER_NAME" /bin/bash
        ;;

    build)
        check_docker
        TARGET=${2:-dashboard}
        log_info "Building Docker image (target: $TARGET)..."
        docker-compose build --no-cache "$TARGET"
        log_success "Build complete."
        ;;

    ps)
        check_docker
        log_info "Running containers:"
        docker-compose ps
        ;;

    clean)
        check_docker
        log_warn "This will remove containers and volumes. Press Ctrl+C to cancel."
        read -p "Continue? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Removing containers and volumes..."
            docker-compose down -v
            log_success "Cleanup complete."
        else
            log_info "Cleanup cancelled."
        fi
        ;;

    restart)
        check_docker
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            log_info "Restarting all services..."
            docker-compose restart
        else
            log_info "Restarting service '$SERVICE'..."
            docker-compose restart "$SERVICE"
        fi
        log_success "Restart complete."
        ;;

    status)
        check_docker
        log_info "Service status:"
        docker-compose ps
        log_info ""
        log_info "Volumes:"
        docker volume ls | grep hermes || echo "No hermes volumes found"
        log_info ""
        log_info "Networks:"
        docker network ls | grep hermes || echo "No hermes networks found"
        ;;

    gpu-check)
        log_info "Checking GPU availability..."
        if command -v nvidia-smi &> /dev/null; then
            log_success "NVIDIA GPU detected:"
            nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
            log_info ""
            log_info "To enable GPU in Docker, ensure:"
            log_info "  1. Docker Desktop has GPU enabled (Settings → Resources → Docker Engine)"
            log_info "  2. Update docker-compose.yml: deploy.resources.reservations.devices"
        else
            log_warn "NVIDIA GPU not detected or nvidia-smi not available."
            log_info "GPU support is optional. Dashboard and training work on CPU."
        fi
        ;;

    help)
        cat << 'EOF'
HERMES Docker Management Script
================================

Usage: ./docker/docker-entrypoint.sh <command> [args]

Commands:

  up [service]           Start services (detached)
                         - service: 'dashboard', 'training', 'dev', or omit for all
                         Example: ./docker-entrypoint.sh up dashboard

  down                   Stop all services
                         Example: ./docker-entrypoint.sh down

  logs [service]         View container logs (follow mode)
                         - service: container name or omit for all
                         Example: ./docker-entrypoint.sh logs dashboard

  shell [service]        Open interactive bash shell in container
                         - service: 'dashboard', 'training', 'dev' (default: dev)
                         Example: ./docker-entrypoint.sh shell dev

  build [target]         Build Docker image from scratch
                         - target: 'dashboard', 'training', 'dev' (default: dashboard)
                         Example: ./docker-entrypoint.sh build dev

  ps                     List running containers and status
                         Example: ./docker-entrypoint.sh ps

  clean                  Remove stopped containers and volumes
                         Example: ./docker-entrypoint.sh clean

  restart [service]      Restart one or all services
                         - service: omit to restart all
                         Example: ./docker-entrypoint.sh restart dashboard

  status                 Show detailed status of all services
                         Example: ./docker-entrypoint.sh status

  gpu-check              Check GPU availability and configuration
                         Example: ./docker-entrypoint.sh gpu-check

  help                   Show this help message

Examples:

  # Start development environment
  ./docker/docker-entrypoint.sh up dev

  # View dashboard logs
  ./docker/docker-entrypoint.sh logs dashboard

  # Open shell in development container
  ./docker/docker-entrypoint.sh shell dev

  # Stop everything
  ./docker/docker-entrypoint.sh down

  # Check GPU for training
  ./docker/docker-entrypoint.sh gpu-check

Environment Variables:

  DASHBOARD_PORT         Port for Flask dashboard (default: 5000)
  JUPYTER_PORT           Port for Jupyter Lab (default: 8888)
  FLASK_ENV              Flask environment: development or production
  DEBUG                  Enable debug mode: true or false
  CUDA_VISIBLE_DEVICES   GPU device IDs (default: empty, uses CPU)

Configuration File: .env

Create a .env file in the docker directory to set defaults:

  DASHBOARD_PORT=5000
  JUPYTER_PORT=8888
  FLASK_ENV=development
  DEBUG=true
  CUDA_VISIBLE_DEVICES=0

Volume Management:

  docker volume ls              List all volumes
  docker volume inspect <name>  Inspect volume details
  docker volume rm <name>       Delete volume

Network:

  Services communicate via 'hermes-network' bridge network.
  Access dashboard from another container: http://dashboard:5000

Troubleshooting:

  Container won't start?
    ./docker-entrypoint.sh logs <service>

  Want a fresh start?
    ./docker-entrypoint.sh clean
    ./docker-entrypoint.sh up

  Check if ports are already in use:
    netstat -tuln | grep <PORT>

For more help, visit: https://docs.docker.com/compose/

EOF
        ;;

    *)
        log_error "Unknown command: $1"
        log_info "Use './docker/docker-entrypoint.sh help' for usage information."
        exit 1
        ;;
esac
