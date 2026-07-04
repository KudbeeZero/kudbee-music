# Advanced Docker Usage for HERMES

This document covers advanced Docker scenarios and configuration options beyond basic development.

---

## Table of Contents

1. [Multi-stage Builds](#multi-stage-builds)
2. [Resource Constraints](#resource-constraints)
3. [Networking](#networking)
4. [Storage & Volumes](#storage--volumes)
5. [CI/CD Integration](#cicd-integration)
6. [Debugging Containers](#debugging-containers)
7. [Performance Optimization](#performance-optimization)
8. [Security Best Practices](#security-best-practices)

---

## Multi-stage Builds

The Dockerfile uses multi-stage builds to optimize image sizes:

```dockerfile
# Stage 1: base
# Stage 2: ml-stack (base + ML libraries)
# Stage 3: dashboard (ml-stack + Flask)
# Stage 4: training (ml-stack + Jupyter)
# Stage 5: dev (all tools)
# Stage 6: prod-dashboard (minimal for cloud)
```

### Building Specific Stages

```bash
# Build only dashboard (smallest, for production)
docker build --target dashboard -t my-app:dashboard .

# Build dev with all tools
docker build --target dev -t my-app:dev .

# Build production-optimized version
docker build --target prod-dashboard -t my-app:prod .
```

### Viewing Stage Sizes

```bash
# Show image layers and sizes
docker history my-app:dashboard

# Check final image size
docker images | grep my-app
```

### Customizing Stages

To add new stages, extend the Dockerfile:

```dockerfile
FROM ml-stack as custom-stage

# Install custom tools
RUN pip install custom-package

# Copy custom code
COPY custom /app/custom

CMD ["python3", "custom/main.py"]
```

Then build and run:

```bash
docker build --target custom-stage -t my-custom .
docker run my-custom
```

---

## Resource Constraints

Prevent containers from consuming excessive system resources.

### Set Memory Limits

In `docker-compose.yml`:

```yaml
services:
  dashboard:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

Or via docker run:

```bash
docker run -m 2g --memory-reservation 1g my-app
```

### Set CPU Limits

```yaml
services:
  dashboard:
    deploy:
      resources:
        limits:
          cpus: '2.0'
        reservations:
          cpus: '1.0'
```

### Monitor Resource Usage

```bash
# Real-time container stats
docker stats

# Show memory usage
docker stats --no-stream | grep dashboard

# Container resource limits
docker inspect hermes-dashboard | grep -A 10 '"Memory'
```

### Prevent Out-of-Memory Kills

```bash
# Increase swap
# Docker Desktop → Settings → Resources → Swap

# Or in docker-compose
services:
  training:
    deploy:
      resources:
        limits:
          memory: 8G
```

---

## Networking

### Service-to-Service Communication

Services on the same network communicate by hostname:

```python
# Inside dashboard container:
import requests
response = requests.get('http://training:8888/api/status')
```

### Custom Networks

Create isolated networks:

```bash
# Create network
docker network create my-network

# Run containers on network
docker run --network my-network my-app
```

### Expose Ports

In `docker-compose.yml`:

```yaml
services:
  dashboard:
    ports:
      - "5000:5000"    # host:container
      - "5001:5000"    # Alternative host port
```

### Host Network Mode

For direct host access (less isolation):

```yaml
services:
  dashboard:
    network_mode: host
```

### Port Forwarding

Map non-standard ports:

```bash
docker run -p 9000:5000 my-app  # http://localhost:9000 → container:5000
```

---

## Storage & Volumes

### Named Volumes

Persist data across container restarts:

```yaml
volumes:
  my-data:
    driver: local

services:
  dashboard:
    volumes:
      - my-data:/app/data
```

### Bind Mounts

Mount host directories (great for development):

```yaml
volumes:
  - /home/user/data:/app/data      # Absolute path
  - ./local-data:/app/data         # Relative path
  - ../monitor:/app/monitor        # Relative (parent dir)
```

### Volume Inspection

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect hermes-lyric-server_hf-cache

# See volume mount point (on host)
docker volume inspect hermes-lyric-server_hf-cache | grep Mountpoint
```

### Backup Volumes

```bash
# Export volume data
docker run --rm -v hermes-lyric-server_hf-cache:/data -v $(pwd):/backup \
  alpine tar czf /backup/hf-cache.tar.gz /data

# Import volume data
docker run --rm -v hermes-lyric-server_hf-cache:/data -v $(pwd):/backup \
  alpine tar xzf /backup/hf-cache.tar.gz -C /
```

### Copy Data Between Containers

```bash
# Copy from container to host
docker cp hermes-dashboard:/app/data /local/path

# Copy from host to container
docker cp /local/path/file hermes-dashboard:/app/
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/docker-build.yml`:

```yaml
name: Build Docker Image

on:
  push:
    branches: [main]
    paths:
      - 'hermes-lyric-server/**'
      - 'docker/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build Dashboard
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./hermes-lyric-server/docker/Dockerfile
          target: dashboard
          push: false  # Set to true to push to registry
          tags: |
            my-registry/hermes-dashboard:latest
            my-registry/hermes-dashboard:${{ github.sha }}

      - name: Build Dev
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./hermes-lyric-server/docker/Dockerfile
          target: dev
          push: false
          tags: my-registry/hermes-dev:latest
```

### GitLab CI/CD Example

Create `.gitlab-ci.yml`:

```yaml
build_docker:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build --target dashboard -t $CI_REGISTRY_IMAGE:dashboard .
    - docker build --target dev -t $CI_REGISTRY_IMAGE:dev .
```

---

## Debugging Containers

### Inspect Container Internals

```bash
# View container configuration
docker inspect hermes-dashboard

# See container processes
docker top hermes-dashboard

# View container logs with timestamps
docker logs --timestamps hermes-dashboard

# Follow logs in real-time
docker logs -f --tail=100 hermes-dashboard
```

### Execute Commands in Running Container

```bash
# Interactive bash
docker exec -it hermes-dashboard bash

# Run one-off command
docker exec hermes-dashboard python3 -c "import torch; print(torch.cuda.is_available())"

# As specific user
docker exec -u root hermes-dashboard apt-get update
```

### Debug Mode

Start container in debug mode:

```bash
# Override entrypoint to shell
docker run -it --entrypoint /bin/bash my-app

# Inside container
python3 -c "import sys; print(sys.path)"
```

### Capture Container Output

```bash
# Save logs to file
docker logs hermes-dashboard > dashboard.log 2>&1

# View specific lines
docker logs --tail=50 hermes-dashboard

# Show logs since specific time
docker logs --since 30m hermes-dashboard
```

### Profiling

Inside container:

```bash
# Python CPU profiling
python3 -m cProfile -s cumulative app.py

# Memory profiling
pip install memory-profiler
python3 -m memory_profiler app.py

# GPU profiling (if available)
nvidia-smi --query-compute-apps=pid,process_name,used_memory \
  --format=csv,noheader --loop=1
```

---

## Performance Optimization

### Reduce Image Size

```bash
# Use slim base image
FROM python:3.11-slim

# Combine RUN commands
RUN apt-get update && \
    apt-get install -y package1 package2 && \
    rm -rf /var/lib/apt/lists/*

# Remove unnecessary files
RUN apt-get purge -y --auto-remove gcc
```

### Build Cache Strategy

```bash
# Order commands from least to most frequently changed
# Install dependencies first (stable)
RUN pip install -r requirements.txt

# Copy code last (frequently changes)
COPY . /app
```

### Multi-stage Build Benefits

```dockerfile
# Base stage (all dependencies)
FROM python:3.11 as deps
RUN pip install -r requirements.txt

# Final stage (only runtime dependencies)
FROM python:3.11-slim
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY app /app
```

### Container Startup Time

```bash
# Profile startup time
time docker run --rm my-app echo "Started"

# Reduce startup overhead
# - Use lighter base images
# - Lazy-load heavy dependencies
# - Pre-download models in Dockerfile
```

### Build Performance

```bash
# Use BuildKit (faster, better caching)
DOCKER_BUILDKIT=1 docker build .

# Build in parallel
docker-compose build --parallel

# Check build progress
BUILDKIT_PROGRESS=plain docker build .
```

---

## Security Best Practices

### Run as Non-root User

In Dockerfile:

```dockerfile
RUN useradd -m -u 1000 appuser
USER appuser
```

Or in `docker-compose.yml`:

```yaml
services:
  dashboard:
    user: "1000:1000"
```

### Scan for Vulnerabilities

```bash
# Docker Scout (built-in to newer Docker)
docker scout cves my-app

# Or use Trivy
trivy image my-app
```

### Use Secrets Securely

Never hardcode secrets. Use Docker secrets or environment variables:

```bash
# Pass at runtime
docker run -e API_KEY=$MY_SECRET my-app

# Or use .env file (git-ignored)
docker run --env-file .env my-app
```

In `docker-compose.yml`:

```yaml
services:
  dashboard:
    environment:
      - API_KEY=${API_KEY}  # From .env file or host env
```

### Limit Capabilities

```bash
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE my-app
```

### Read-only Filesystem

```bash
docker run --read-only --tmpfs /tmp my-app
```

### Image Signing

Sign images for production:

```bash
# Enable content trust
DOCKER_CONTENT_TRUST=1 docker push my-registry/app:latest
```

### Keep Base Images Updated

```bash
# Rebuild periodically to get security patches
docker build --no-cache my-app

# Check for newer base image versions
docker pull python:3.11-slim
```

### .dockerignore for Security

Don't copy secrets into image:

```
.env
.env.local
*.pem
*.key
.git
```

---

## Troubleshooting Advanced Issues

### Container Fails to Start

```bash
# Check logs
docker logs hermes-dashboard

# Inspect configuration
docker inspect hermes-dashboard | grep -A 5 State

# Try in debug mode
docker run -it my-app bash
```

### Performance Issues

```bash
# Check resource limits
docker stats

# Increase memory/CPU in Docker Desktop settings

# Profile in container
docker exec hermes-dashboard python3 -m cProfile app.py
```

### Network Issues

```bash
# Test DNS
docker exec hermes-dashboard ping dashboard

# Check network configuration
docker network inspect hermes-network

# Restart network
docker-compose down
docker-compose up
```

### Volume Mount Issues

```bash
# Check mount permissions
docker exec hermes-dashboard ls -la /app/monitor

# Verify volume exists
docker volume ls

# Inspect volume
docker volume inspect hermes-lyric-server_dashboard-data
```

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Specification](https://compose-spec.io/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security](https://docs.docker.com/engine/security/)

---

**Questions?** Check the main [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md) or ask in your team channel.
