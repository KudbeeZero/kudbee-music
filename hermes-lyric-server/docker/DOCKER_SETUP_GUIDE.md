# Docker Setup Guide for HERMES (kudbee-music)

## Overview

This guide walks you through containerizing and running the kudbee-music HERMES system locally using Docker, specifically designed for **Windows + WSL2** development.

**Estimated time: 10-15 minutes**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Desktop Installation (Windows + WSL2)](#docker-desktop-installation-windows--wsl2)
3. [Quick Start](#quick-start)
4. [Services Explained](#services-explained)
5. [Usage Guide](#usage-guide)
6. [Development Workflow](#development-workflow)
7. [GPU Support](#gpu-support)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Before Starting

Ensure you have:

- **Windows 10 Build 19041+** or **Windows 11**
- **WSL2** installed (see [LOCAL_SETUP_WSL_WINDOWS.md](../LOCAL_SETUP_WSL_WINDOWS.md) for setup)
- **5-10 GB free disk space** (for Docker images and ML models)
- **Administrator access** (to install Docker Desktop)

### System Resources

Recommended for development:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU Cores | 2 | 4+ |
| RAM | 4 GB | 8 GB+ |
| Disk Space | 10 GB | 20 GB+ |
| GPU (optional) | — | NVIDIA GPU with CUDA 11.8+ |

---

## Docker Desktop Installation (Windows + WSL2)

### Step 1: Download Docker Desktop

1. Go to [Docker's official website](https://www.docker.com/products/docker-desktop)
2. Click **"Download for Windows"**
3. Choose the appropriate version:
   - **Intel/AMD**: `Docker Desktop for Windows (x86)`
   - **Apple Silicon**: Not applicable on Windows

### Step 2: Install Docker Desktop

1. Run the downloaded `.exe` installer
2. Follow the installation wizard
3. **Important**: When prompted, ensure **"Use WSL 2 instead of Hyper-V"** is checked
4. Restart your computer when prompted

### Step 3: Verify Installation

Open **PowerShell** and run:

```powershell
docker --version
docker-compose --version
```

You should see version numbers for both. If not, restart PowerShell or your computer.

### Step 4: Allocate Resources to WSL2

Docker Desktop uses WSL2, so allocate sufficient resources:

1. Open Docker Desktop
2. Go to **Settings** (gear icon) → **Resources**
3. Configure:
   - **CPU**: 4+ cores (half your system cores)
   - **Memory**: 4-8 GB (if you have 16GB RAM, allocate 8GB)
   - **Disk**: 20-30 GB
4. Apply & Restart

### Step 5: Test Docker

In WSL2 (Ubuntu terminal), run:

```bash
docker run hello-world
```

You should see a "Hello from Docker!" message.

---

## Quick Start

### Step 1: Navigate to Project

```bash
cd ~/projects/kudbee-music/hermes-lyric-server/docker
```

### Step 2: Copy Environment Configuration

```bash
cp .env.example .env
# Edit .env if you want custom ports or settings (optional)
```

### Step 3: Start Services

#### Option A: Using Makefile (Recommended)

```bash
make up
```

Or for specific services:

```bash
make up-dashboard    # Start only dashboard
make up-training     # Start only Jupyter training environment
make up-dev          # Start full development environment
```

#### Option B: Using docker-compose Directly

```bash
docker-compose up
```

Or with custom services:

```bash
docker-compose --profile default up     # Default (dashboard)
docker-compose --profile dev up         # Full dev environment
docker-compose --profile training up    # Training environment
```

### Step 4: Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Dashboard | `http://localhost:5000` | Flask monitoring dashboard |
| Jupyter | `http://localhost:8888` | Training environment (if running) |

### Step 5: View Logs

```bash
make logs
```

Or for specific service:

```bash
make logs-dashboard
```

### Step 6: Stop Services

```bash
make down
```

---

## Services Explained

### 1. Dashboard Service

**Port**: 5000 (configurable via `DASHBOARD_PORT` in `.env`)

**Purpose**: Flask monitoring dashboard that shows:
- Git metrics (kudbee-music, kudbee-engine)
- System health (GPU status, memory)
- Research phase metrics

**Start with**:
```bash
make up-dashboard
# or
docker-compose up dashboard
```

**Access**: http://localhost:5000

**Volume mounts**:
- `/app/monitor` → `../monitor/` (live code editing)
- `/app/data` → persistent volume (metrics storage)

### 2. Training Service

**Port**: 8888 (Jupyter Lab)

**Purpose**: Jupyter environment for:
- Running Mistral 7B LoRA training notebook
- Interactive experimentation
- Model fine-tuning

**Start with**:
```bash
make up-training
# or
docker-compose --profile training up training
```

**Access**: http://localhost:8888

**Volume mounts**:
- `/app/training` → `../training/` (notebooks)
- `/root/.cache/huggingface` → persistent HF model cache
- `/app/training/outputs` → persistent training outputs

**Get Jupyter Token**:
```bash
make logs-training
# Look for: "token=..."
```

### 3. Development Service (Dev)

**Ports**: 5000, 8888, 8000

**Purpose**: Complete development environment with:
- Flask dashboard
- Jupyter Lab
- Python development tools (black, flake8, pytest)
- Full project mounted for editing

**Start with**:
```bash
make up-dev
# or
docker-compose --profile dev up dev
```

**Interactive Shell**:
```bash
make shell
# Now you're inside the container
# Run: python3 -m monitor.dashboard_server
# Or: jupyter lab --ip=0.0.0.0 --port=8888
```

---

## Usage Guide

### Building Images

```bash
# Build all images
make build

# Build specific image
make build-dashboard
make build-training
make build-dev

# Build production-optimized dashboard
make build-prod
```

### Container Management

```bash
# List running containers
make ps

# Show detailed status
make status

# Restart all services
make restart

# Restart specific service
make restart-dashboard

# Open shell in container
make shell              # Opens dev container
make shell-dashboard   # Opens dashboard container
make shell-training    # Opens training container
```

### Cleanup

```bash
# Stop all services
make down

# Stop and remove containers
make clean             # Interactive prompt
make clean-force       # Force (no prompt)

# Remove unused images and volumes
make prune
```

### Viewing Logs

```bash
# All services
make logs

# Specific service
make logs-dashboard
make logs-training
make logs-dev

# Real-time follow
docker-compose logs -f dashboard

# Last 100 lines
docker-compose logs --tail=100 dashboard
```

---

## Development Workflow

### Typical Local Development Loop

#### 1. Start Dev Environment

```bash
cd ~/projects/kudbee-music/hermes-lyric-server/docker
make up-dev
```

#### 2. Edit Code in Host (Windows)

Using VS Code or your preferred editor:

```bash
# In VS Code (WSL): Ctrl+K, Ctrl+O
# Navigate to: /home/your-username/projects/kudbee-music
```

Edit files like:
- `hermes-lyric-server/monitor/dashboard_server.py`
- `hermes-lyric-server/monitor/templates/dashboard.html`

#### 3. Changes Reflect in Container

Because of **volume mounts**, changes immediately appear in the running container:

```bash
# Flask auto-reload is enabled in development mode
# Your dashboard will automatically refresh
```

#### 4. Open Interactive Shell (Optional)

For testing or debugging:

```bash
make shell
# You're now inside the container
python3 -c "import torch; print(torch.cuda.is_available())"
```

#### 5. Commit and Push

```bash
cd ~/projects/kudbee-music
git add hermes-lyric-server/monitor/dashboard_server.py
git commit -m "Update dashboard metrics"
git push origin main
```

#### 6. Stop Services

```bash
cd hermes-lyric-server/docker
make down
```

### Hot Reload in Flask

The dashboard runs with Flask debug enabled:

```
FLASK_ENV=development
FLASK_DEBUG=true
```

This means:
- Changes to `.py` files auto-reload the app
- Changes to HTML templates require browser refresh

### Running Training

```bash
# Start training environment
make up-training

# Get Jupyter token
make logs-training

# Open in browser: http://localhost:8888
# Enter token when prompted

# Upload or access training notebook:
# hermes-lyric-server/training/mistral_7b_lora_training.ipynb
```

---

## GPU Support

### Check GPU Availability

```bash
make gpu-check
```

If you see NVIDIA GPU info, your system has GPU support.

### Enable GPU in Docker (Windows + WSL2)

#### Prerequisites

1. **NVIDIA GPU** (GeForce RTX, A100, etc.)
2. **NVIDIA Driver** installed on Windows (version 536.40+)
3. **NVIDIA CUDA Toolkit** (optional, Docker handles it)

#### Step 1: Enable GPU in Docker Desktop

1. Open Docker Desktop
2. Go to **Settings** → **Resources** → **Docker Engine**
3. Look for GPU section; ensure your GPU is listed
4. Apply & Restart Docker

#### Step 2: Update docker-compose.yml

Edit `docker-compose.yml` and add GPU device mapping:

```yaml
services:
  training:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

Alternatively, set environment variable in `.env`:

```bash
CUDA_VISIBLE_DEVICES=0
```

#### Step 3: Verify GPU in Container

```bash
make shell

# Inside container:
python3 -c "
import torch
print(f'CUDA Available: {torch.cuda.is_available()}')
print(f'GPU: {torch.cuda.get_device_name(0)}')
print(f'Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB')
"
```

### Training with GPU

The training notebook (`mistral_7b_lora_training.ipynb`) automatically uses GPU if available:

```python
# In notebook:
import torch
print(torch.cuda.is_available())  # True if GPU detected
print(torch.cuda.get_device_name(0))  # GPU name
```

**Performance**: ~45 minutes on T4 GPU (vs. hours on CPU)

---

## Troubleshooting

### Issue: "Docker command not found"

**Solution**:

1. Ensure Docker Desktop is installed and running
2. Open WSL2 terminal and verify:
   ```bash
   which docker
   ```
3. If not found, restart WSL:
   ```bash
   wsl --shutdown
   wsl
   ```

### Issue: "Cannot connect to Docker daemon"

**Solution**:

1. Ensure Docker Desktop is **running** (check system tray)
2. Restart Docker Desktop:
   - Right-click Docker icon → Restart
3. Restart WSL:
   ```bash
   wsl --shutdown
   ```

### Issue: "Port 5000 already in use"

**Solution**:

1. Change port in `.env`:
   ```bash
   DASHBOARD_PORT=5001
   ```
2. Or kill process on port:
   ```bash
   # Find process
   netstat -tuln | grep 5000
   
   # Kill it (replace PID)
   kill -9 <PID>
   ```

### Issue: Container exits immediately

**Solution**:

1. Check logs:
   ```bash
   docker-compose logs dashboard
   ```
2. Look for error messages
3. Ensure all required files exist:
   ```bash
   ls -la ~/projects/kudbee-music/hermes-lyric-server/monitor/
   ```

### Issue: "Out of memory" errors

**Solution**:

1. Allocate more RAM to WSL2:
   - Docker Desktop → Settings → Resources → Memory
   - Increase to 6-8 GB if available
2. Reduce number of concurrent containers:
   ```bash
   make down  # Stop all
   make up-dashboard  # Start only dashboard
   ```

### Issue: GPU not detected in container

**Solution**:

1. Verify GPU on host:
   ```bash
   nvidia-smi
   ```
2. Check Docker GPU support:
   ```bash
   docker run --rm --gpus all nvidia/cuda:11.8.0-runtime-ubuntu22.04 nvidia-smi
   ```
3. If step 2 fails, GPU support isn't configured in Docker Desktop
4. Update `docker-compose.yml` with correct GPU configuration (see GPU Support section)

### Issue: Build fails with "No space left on device"

**Solution**:

1. Check Docker disk usage:
   ```bash
   docker system df
   ```
2. Clean up unused images:
   ```bash
   docker system prune -a
   ```
3. Increase Docker disk allocation:
   - Docker Desktop → Settings → Resources → Disk image size

### Issue: Model download fails in Jupyter

**Solution**:

1. Ensure internet connectivity in container
2. Set HuggingFace cache:
   ```bash
   export HF_HOME=/root/.cache/huggingface
   ```
3. Pre-download model (in container shell):
   ```bash
   python3 -c "
   from transformers import AutoModelForCausalLM
   model = AutoModelForCausalLM.from_pretrained('mistralai/Mistral-7B-Instruct-v0.1')
   "
   ```

---

## Advanced Configuration

### Custom Docker Compose Profiles

Compose profiles let you group services:

```yaml
# In docker-compose.yml
services:
  myservice:
    profiles: [custom, all]
```

Start with profile:

```bash
docker-compose --profile custom up
```

### Multi-Host Deployment

To run on cloud (e.g., AWS EC2, GCP):

1. Replace volume mounts with persistent volumes or S3
2. Update `.env` for production:
   ```bash
   FLASK_ENV=production
   DEBUG=false
   ```
3. Use production-optimized image:
   ```bash
   docker build --target prod-dashboard -t my-app:latest .
   ```

### Mounting External Datasets

For large training data:

```yaml
volumes:
  training-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/c/data  # Windows path mounted in WSL
```

### Networking Between Containers

Services communicate via container names:

```python
# Inside dashboard container:
import requests
# Talk to training via hostname 'training'
response = requests.get('http://training:8888/api/status')
```

### Persistent Environment Variables

Create `.env` file in docker directory:

```bash
FLASK_ENV=development
DEBUG=true
DASHBOARD_PORT=5000
JUPYTER_PORT=8888
```

Then run:

```bash
docker-compose --env-file .env up
```

### Viewing Image Layers

To see what's inside a built image:

```bash
docker history kudbee/hermes-dashboard:latest
```

### Exporting/Importing Images

Save image as tar file:

```bash
docker save kudbee/hermes-dashboard:latest > hermes-dashboard.tar
```

Load on another machine:

```bash
docker load < hermes-dashboard.tar
```

---

## Best Practices

### 1. Always Use Volumes for Development

```yaml
volumes:
  - ../monitor:/app/monitor  # Changes reflect immediately
```

### 2. Set Resource Limits

Prevent containers from consuming all resources:

```yaml
services:
  dashboard:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 3. Use .dockerignore

Keep build context small:

```
.git
__pycache__
venv
*.pyc
.DS_Store
```

### 4. Name Services Consistently

Use clear naming:

```
hermes-dashboard
hermes-training
hermes-dev
```

### 5. Health Checks

Monitor container health:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 6. Logs for Debugging

Always check logs first:

```bash
docker-compose logs -f <service>
```

---

## Next Steps

1. ✅ Install Docker Desktop
2. ✅ Clone kudbee-music repository
3. ✅ Navigate to `hermes-lyric-server/docker`
4. ✅ Run `make up-dev`
5. ✅ Access dashboard at http://localhost:5000
6. ✅ Start developing!

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [WSL2 Guide](../LOCAL_SETUP_WSL_WINDOWS.md)
- [HERMES Documentation](https://github.com/KudbeeZero/kudbee-music)

---

**Questions or issues?** Check the [Troubleshooting](#troubleshooting) section or ask in your team channel.
