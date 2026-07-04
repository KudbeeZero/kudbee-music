# HERMES Docker Quick Reference Card

**Print this page or keep it handy while developing!**

---

## 🚀 Quick Start (First Time)

```bash
# 1. Install Docker Desktop for Windows
#    https://docker.com/products/docker-desktop
#    - Ensure "Use WSL 2" is selected
#    - Restart computer

# 2. Navigate to docker directory
cd ~/projects/kudbee-music/hermes-lyric-server/docker

# 3. Copy configuration
cp .env.example .env

# 4. Start dev environment
make up-dev

# 5. Open browser
# http://localhost:5000  (Dashboard)
```

---

## ⚡ Essential Commands

| Command | Purpose |
|---------|---------|
| `make up-dev` | Start development environment |
| `make up` | Start default services (dashboard) |
| `make down` | Stop all services |
| `make logs` | View all logs |
| `make shell` | Open container shell (bash) |
| `make ps` | List running containers |
| `make restart` | Restart all services |
| `make clean` | Remove containers and volumes |
| `make help` | Show all available commands |

---

## 📍 Service URLs

| Service | URL | Token/Login |
|---------|-----|------------|
| **Dashboard** | http://localhost:5000 | None (public) |
| **Jupyter** | http://localhost:8888 | Token in logs: `make logs-training` |

---

## 🔧 Development Workflow

### Edit Code
Edit in VS Code (host machine) → Changes auto-reload in container → Browser refresh

```bash
# In VS Code (WSL Remote):
# Open: /home/username/projects/kudbee-music/hermes-lyric-server/
```

### Test Changes
```bash
# View real-time logs
make logs-dashboard

# Open container shell
make shell
python3 -m monitor.dashboard_server  # Run manually
```

### Commit Changes
```bash
cd ~/projects/kudbee-music
git add hermes-lyric-server/
git commit -m "Update dashboard"
git push origin main
```

---

## 🐳 Docker Commands Cheat Sheet

```bash
# Start services
make up              # Default (dashboard)
make up-dev          # Development (all tools)
make up-training     # Training only
make up-dashboard    # Dashboard only

# Stop services
make down            # Graceful stop
make clean           # Stop + remove volumes
make clean-force     # Force remove (no prompt)

# View status
make ps              # Running containers
make status          # Detailed status
make logs            # All logs
make logs-dashboard  # Dashboard logs only

# Container management
make shell           # Open bash in dev container
make shell-dashboard # Open bash in dashboard
make restart         # Restart all services
make build           # Rebuild images

# Utilities
make gpu-check       # Check GPU availability
make volumes         # List Docker volumes
make version         # Docker version info
make help            # Show all commands
```

---

## 📁 File Structure

```
hermes-lyric-server/
├── docker/                    # Docker configuration
│   ├── Dockerfile            # Multi-stage build
│   ├── docker-compose.yml    # Service orchestration
│   ├── .dockerignore         # Build context exclusions
│   ├── .env.example          # Configuration template
│   ├── Makefile              # Convenient commands
│   ├── docker-entrypoint.sh  # Script alternative to Makefile
│   ├── README.md             # Quick overview
│   ├── DOCKER_SETUP_GUIDE.md # Comprehensive setup guide
│   ├── ADVANCED_DOCKER_USAGE.md  # Advanced configuration
│   └── QUICK_REFERENCE.md    # This file
├── requirements.txt          # Python dependencies
├── requirements-dev.txt      # Development dependencies
├── monitor/
│   ├── dashboard_server.py   # Flask app
│   └── templates/
└── training/
    └── mistral_7b_lora_training.ipynb
```

---

## 🛠️ Common Tasks

### Change Port Numbers
```bash
# Edit .env
DASHBOARD_PORT=5001
JUPYTER_PORT=8889

# Restart
make restart
```

### View Database Logs
```bash
# Real-time
make logs dashboard

# Last 100 lines
docker-compose logs --tail=100 dashboard

# Save to file
docker-compose logs > logs.txt
```

### Run Python Command in Container
```bash
make shell
python3 -c "import torch; print(torch.cuda.is_available())"
```

### Rebuild Image (Clean Build)
```bash
make build
```

### Check Disk Usage
```bash
docker system df
docker volume ls | grep hermes
```

### Delete All Docker Data
```bash
# Careful! This removes everything
make clean-force
docker system prune -a --volumes
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Port already in use** | Change `DASHBOARD_PORT` in `.env` |
| **Container won't start** | `make logs` to see error |
| **Out of memory** | Increase Docker memory (Docker Desktop → Settings) |
| **Cannot find docker** | Restart WSL: `wsl --shutdown` then `wsl` |
| **GPU not detected** | Run `make gpu-check` and enable in Docker settings |

---

## 📚 Documentation

| Document | Content |
|----------|---------|
| [README.md](README.md) | Quick overview |
| [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md) | Complete setup & troubleshooting |
| [ADVANCED_DOCKER_USAGE.md](ADVANCED_DOCKER_USAGE.md) | Advanced configuration |
| [LOCAL_SETUP_WSL_WINDOWS.md](../LOCAL_SETUP_WSL_WINDOWS.md) | Full WSL + Docker setup |

---

## 🎯 Next Steps

1. ✅ Install Docker Desktop
2. ✅ Navigate to `hermes-lyric-server/docker`
3. ✅ Run `cp .env.example .env`
4. ✅ Run `make up-dev`
5. ✅ Open http://localhost:5000
6. ✅ Start developing!

---

## 🆘 Need Help?

1. Check logs: `make logs`
2. Read full guide: [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md)
3. Run specific command: `make help`
4. Open shell: `make shell`

---

**Pro Tip**: Run `make help` anytime for a list of all available commands!
