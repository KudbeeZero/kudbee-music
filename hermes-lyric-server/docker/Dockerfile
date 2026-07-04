# Multi-stage Dockerfile for kudbee-music/hermes-lyric-server
# Targets: dashboard, training, development
#
# Build stages:
#  1. base: Python 3.11 + system dependencies
#  2. ml-stack: base + PyTorch + transformers + LoRA tools
#  3. dashboard: ml-stack + Flask + monitoring deps
#  4. training: ml-stack + training utilities
#  5. dev: dashboard + training (all tools for development)

# ============================================================================
# Stage 1: Base - Python 3.11 with common system dependencies
# ============================================================================
FROM python:3.11-slim as base

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system-level dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    git \
    git-lfs \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Create app directory
WORKDIR /app

# ============================================================================
# Stage 2: ML-Stack - Base + PyTorch + transformers + PEFT + bitsandbytes
# ============================================================================
FROM base as ml-stack

# Install PyTorch and ML dependencies
# Using CPU by default; GPU support requires CUDA libraries (handled at runtime via device mapping)
RUN pip install --no-cache-dir \
    torch==2.1.1 --index-url https://download.pytorch.org/whl/cpu \
    transformers==4.35.2 \
    peft==0.7.1 \
    bitsandbytes==0.41.2.post2 \
    datasets==2.14.5 \
    accelerate==0.24.1 \
    trl==0.7.4 \
    numpy \
    scipy \
    scikit-learn

# Note: For GPU training in cloud/Docker with actual GPU access,
# update torch installation to include CUDA:
# torch==2.1.1 --index-url https://download.pytorch.org/whl/cu118

# ============================================================================
# Stage 3: Dashboard - ML-Stack + Flask + monitoring
# ============================================================================
FROM ml-stack as dashboard

# Install Flask and monitoring dependencies
RUN pip install --no-cache-dir \
    Flask==3.0.0 \
    Werkzeug==3.0.1 \
    requests==2.31.0

# Copy dashboard code
COPY hermes-lyric-server/monitor /app/monitor

# Expose dashboard port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

# Default command for dashboard service
CMD ["python3", "-m", "monitor.dashboard_server"]

# ============================================================================
# Stage 4: Training - ML-Stack + training utilities
# ============================================================================
FROM ml-stack as training

# Install additional training tools (notebooks, utilities)
RUN pip install --no-cache-dir \
    jupyter==1.0.0 \
    jupyterlab==4.0.9 \
    ipykernel==6.26.0 \
    ipywidgets==8.1.1 \
    matplotlib==3.8.2 \
    pandas==2.1.3

# Expose Jupyter port
EXPOSE 8888

# Default command for training service (Jupyter Lab)
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]

# ============================================================================
# Stage 5: Dev - All tools (dashboard + training + development)
# ============================================================================
FROM ml-stack as dev

# Install Flask, Jupyter, and development tools
RUN pip install --no-cache-dir \
    Flask==3.0.0 \
    Werkzeug==3.0.1 \
    requests==2.31.0 \
    jupyter==1.0.0 \
    jupyterlab==4.0.9 \
    ipykernel==6.26.0 \
    ipywidgets==8.1.1 \
    matplotlib==3.8.2 \
    pandas==2.1.3 \
    black==23.12.0 \
    flake8==6.1.0 \
    pylint==3.0.3 \
    pytest==7.4.3 \
    ipython==8.17.2

# Copy entire project for development
COPY . /app

EXPOSE 5000 8888 8000

# Default command for dev (bash for interactive development)
CMD ["/bin/bash"]

# ============================================================================
# Stage 6: Production Dashboard - Optimized for cloud deployment
# ============================================================================
FROM python:3.11-slim as prod-dashboard

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install only essential runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

WORKDIR /app

# Install only production dependencies for dashboard
RUN pip install --no-cache-dir \
    Flask==3.0.0 \
    Werkzeug==3.0.1 \
    requests==2.31.0

# Copy only dashboard code
COPY hermes-lyric-server/monitor /app/monitor

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

CMD ["python3", "-m", "monitor.dashboard_server"]
