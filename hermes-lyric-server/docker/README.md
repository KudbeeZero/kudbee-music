# HERMES Docker Setup

Fast-track containerization for kudbee-music local development on Windows + WSL2.

## Quick Start (5 minutes)

```bash
# 1. Navigate to docker directory
cd hermes-lyric-server/docker

# 2. Copy configuration
cp .env.example .env

# 3. Start services
make up           # All default services
# or
make up-dev       # Full development environment (recommended)

# 4. Access dashboard
# http://localhost:5000
```

## Services

| Service | Port | Purpose | Start Command |
|---------|------|---------|---|
| **Dashboard** | 5000 | Flask monitoring server | `make up-dashboard` |
| **Training** | 8888 | Jupyter Lab (LoRA training) | `make up-training` |
| **Dev** | 5000, 8888 | All tools (recommended) | `make up-dev` |

## Common Commands

```bash
# Start/Stop
make up              # Start default services
make down            # Stop all services
make restart         # Restart services

# Logs & Debugging
make logs            # View all logs
make shell           # Open container shell
make status          # Show service status

# Building
make build           # Build images
make build-dev       # Build dev image only

# Cleanup
make clean           # Remove containers & volumes
make prune           # Clean up Docker system

# GPU (if available)
make gpu-check       # Check GPU availability
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for dashboard, training, dev, production |
| `docker-compose.yml` | Orchestrates all services with volumes & networking |
| `.dockerignore` | Excludes large/unnecessary files from build |
| `.env.example` | Configuration template (copy to `.env`) |
| `docker-entrypoint.sh` | Shell script alternative to Makefile |
| `Makefile` | Convenient make targets (recommended) |
| `DOCKER_SETUP_GUIDE.md` | Comprehensive setup & troubleshooting guide |

## Installation (First Time)

### Prerequisites

- Windows 10 Build 19041+ or Windows 11
- WSL2 installed ([guide](../LOCAL_SETUP_WSL_WINDOWS.md))
- 5-10 GB free disk space

### Install Docker Desktop

1. Download from [docker.com](https://www.docker.com/products/docker-desktop)
2. Install and ensure **"Use WSL 2"** is selected
3. Restart computer
4. Verify: `docker --version`

### Configure Resources

Docker Desktop → Settings → Resources:
- **CPU**: 4+ cores
- **Memory**: 4-8 GB
- **Disk**: 20-30 GB

## Development Workflow

### 1. Start Dev Environment

```bash
make up-dev
```

### 2. Edit Code in VS Code (Host Machine)

Use WSL Remote extension to edit files in `/home/username/projects/kudbee-music`.

### 3. Changes Auto-Reload in Container

Flask debug mode is enabled; browser auto-refreshes on code changes.

### 4. Interactive Shell (Optional)

```bash
make shell
python3 -m monitor.dashboard_server  # Run app directly
```

### 5. Stop Services

```bash
make down
```

## Accessing Services

### Dashboard

```
http://localhost:5000
```

Shows real-time metrics:
- Git repository stats
- System health
- Research phase progress

### Jupyter Lab (Training)

```
http://localhost:8888
```

Token required (shown in logs):
```bash
make logs-training | grep token=
```

Access training notebook:
```
hermes-lyric-server/training/mistral_7b_lora_training.ipynb
```

## Volumes & Persistence

Services use Docker volumes for:

| Volume | Purpose | Contents |
|--------|---------|----------|
| `dashboard-data` | Dashboard metrics | Persistent data |
| `hf-cache` | HuggingFace models | Large, shared across services |
| `training-outputs` | Training results | Model checkpoints, LoRA adapters |
| `shared-data` | Shared directory | Data shared between services |

View volumes:
```bash
docker volume ls | grep hermes
```

Inspect volume:
```bash
docker volume inspect hermes-lyric-server_hf-cache
```

## GPU Support (Optional)

### Check GPU

```bash
make gpu-check
```

### Enable GPU in Docker

1. Docker Desktop → Settings → Resources → GPU
2. Enable and assign GPU
3. Restart Docker

### Verify in Container

```bash
make shell
python3 -c "import torch; print(torch.cuda.is_available())"
```

## Troubleshooting

### Port Already in Use

Edit `.env`:
```
DASHBOARD_PORT=5001
JUPYTER_PORT=8889
```

### Container Won't Start

Check logs:
```bash
make logs
```

### Out of Memory

Increase Docker memory allocation in Docker Desktop settings.

### More Help

See [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md) for comprehensive troubleshooting.

## Next Steps

1. ✅ [Install Docker Desktop](DOCKER_SETUP_GUIDE.md#docker-desktop-installation-windows--wsl2)
2. ✅ [Read full setup guide](DOCKER_SETUP_GUIDE.md)
3. ✅ `make up-dev` and start developing
4. ✅ Access dashboard at http://localhost:5000

---

**Need help?** Check [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md) or your team channel.
