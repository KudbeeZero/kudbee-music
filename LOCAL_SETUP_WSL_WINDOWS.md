# Local Development Setup: Windows + WSL2

This guide walks you through setting up a complete local development environment on your Windows machine using WSL2 (Windows Subsystem for Linux). You'll be able to work locally while staying synced with your cloud environment.

**Estimated time: 15-20 minutes**

---

## Table of Contents

1. [WSL2 Installation](#wsl2-installation)
2. [Initial WSL Setup](#initial-wsl-setup)
3. [Git Configuration](#git-configuration)
4. [Clone Repositories](#clone-repositories)
5. [Local Development Workflow](#local-development-workflow)
6. [Dashboard Access](#dashboard-access)
7. [IDE Setup (VS Code)](#ide-setup--vs-code)
8. [Troubleshooting](#troubleshooting)

---

## WSL2 Installation

### Step 1: Check if WSL2 is Already Installed

Open **PowerShell as Administrator** and run:

```powershell
wsl --list --verbose
```

If you see a list with "Ubuntu" and "2" in the VERSION column, skip to [Initial WSL Setup](#initial-wsl-setup).

### Step 2: Install WSL2 (If Not Already Installed)

Still in **PowerShell (Admin)**:

```powershell
wsl --install -d Ubuntu-22.04
```

This installs WSL2 with Ubuntu 22.04. You may see a prompt to restart — **restart your computer when prompted**.

### Step 3: Launch Ubuntu and Create a User

After restart, open **PowerShell or Terminal** and run:

```powershell
wsl
```

This opens an Ubuntu bash prompt. On first launch, it will ask you to create a username and password. Use something simple you'll remember (e.g., your first name):

```bash
Enter new UNIX username: your-username
Enter new UNIX password: your-password
Retype new UNIX password: your-password
```

You're now in WSL2 Ubuntu. Welcome!

---

## Initial WSL Setup

### Step 1: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Git

```bash
sudo apt install -y git
```

### Step 3: Install Python and pip (If Not Installed)

```bash
sudo apt install -y python3 python3-venv python3-pip
```

### Step 4: Install Other Useful Tools (Optional but Recommended)

```bash
sudo apt install -y curl wget vim nano
```

---

## Git Configuration

### Step 1: Set Git User Information

In your WSL2 terminal, configure git with your name and email:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### Step 2: Set Up GitHub Authentication

You have two options: **SSH (recommended)** or **HTTPS with Personal Access Token**.

#### Option A: SSH (Recommended)

Generate an SSH key:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Press Enter through all prompts to accept defaults. Then display your public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519...`).

Go to **GitHub → Settings → SSH and GPG keys → New SSH key** and paste it.

Test the connection:

```bash
ssh -T git@github.com
```

You should see:
```
Hi YourUsername! You've successfully authenticated, but GitHub does not provide shell access.
```

#### Option B: HTTPS with Personal Access Token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**
2. Check `repo` scope and generate
3. Copy the token (you won't see it again)
4. In WSL, when cloning, use:
   ```bash
   git clone https://your-username:YOUR_TOKEN@github.com/KudbeeZero/repo-name.git
   ```

Or store credentials so you don't repeat it:

```bash
git config --global credential.helper store
# Next git clone/push will prompt you, then it's cached
```

---

## Clone Repositories

### Step 1: Create a Projects Directory

```bash
mkdir -p ~/projects
cd ~/projects
```

### Step 2: Clone the Public Repository (kudbee-music)

```bash
git clone https://github.com/KudbeeZero/kudbee-music.git
cd kudbee-music
```

Verify the clone:

```bash
git log --oneline | head -5
```

### Step 3: Clone the Private Repository (kudbee-engine)

Navigate back and clone:

```bash
cd ~/projects
git clone https://github.com/KudbeeZero/kudbee-engine.git
cd kudbee-engine
```

If using SSH, this should work seamlessly. If using HTTPS, you'll be prompted for credentials.

### Step 4: Verify Both Repos

```bash
cd ~/projects
ls -la
```

You should see:
```
kudbee-music/
kudbee-engine/
```

---

## Local Development Workflow

### Making Changes

1. **Navigate to your repo:**
   ```bash
   cd ~/projects/kudbee-music
   # or
   cd ~/projects/kudbee-engine
   ```

2. **Check status:**
   ```bash
   git status
   ```

3. **Make your code changes** (using your editor, see IDE Setup below)

4. **Stage changes:**
   ```bash
   git add .
   # or add specific files:
   git add src/file1.py src/file2.py
   ```

5. **Commit:**
   ```bash
   git commit -m "Brief description of changes"
   ```

### Pushing to GitHub

```bash
git push origin main
# or whatever branch you're on:
git push origin your-branch-name
```

### Pulling Latest from GitHub

Before starting work, always pull:

```bash
git pull origin main
```

Or if on a feature branch:

```bash
git pull origin your-branch-name
```

### Syncing with Cloud Environment

Since you have both cloud and local setups, here's the workflow:

1. **On cloud (when making changes):**
   - Make changes, commit, and push to GitHub

2. **On local (to get cloud changes):**
   ```bash
   cd ~/projects/kudbee-music
   git pull origin main
   ```

3. **On local (when making changes):**
   - Make changes, commit, and push to GitHub

4. **On cloud (to get local changes):**
   - In your cloud terminal:
   ```bash
   cd /path/to/repo
   git pull origin main
   ```

**Best Practice:** Always commit and push from one environment before switching to the other. This avoids merge conflicts.

### Creating Feature Branches

For non-main work:

```bash
git checkout -b feature/my-feature
# Make changes and commit
git push origin feature/my-feature
# Then create a PR on GitHub
```

---

## Dashboard Access

### Cloud Dashboard (Public)

The cloud HERMES monitoring dashboard is publicly accessible at:

```
https://3377-54-90-185-12.ngrok-free.app
```

This shows real-time metrics, system stats, and research data from your cloud environment. No login needed.

### Running Dashboard Locally (Optional)

If the `kudbee-music` repo contains dashboard code, you can run a local copy:

1. Navigate to the repo:
   ```bash
   cd ~/projects/kudbee-music
   ```

2. Check for a local server script or requirements:
   ```bash
   ls -la
   cat README.md  # Check for setup instructions
   ```

3. Set up a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

4. Install dependencies (if using pip):
   ```bash
   pip install -r requirements.txt
   ```

5. Run the server (exact command depends on your project):
   ```bash
   python3 app.py
   # or
   python3 -m server.main
   # Check README for the actual command
   ```

The local dashboard will typically be at `http://localhost:5000` or similar. Check your project docs.

---

## IDE Setup: VS Code

VS Code with the **Remote - WSL** extension gives you seamless WSL integration.

### Step 1: Install VS Code (If Not Already Installed)

Download from [https://code.visualstudio.com/](https://code.visualstudio.com/) and install on Windows.

### Step 2: Install the WSL Extension

1. Open VS Code
2. Go to **Extensions** (Ctrl+Shift+X)
3. Search for `Remote - WSL` and install the Microsoft extension

### Step 3: Open Your Project in WSL

Option A: **From command line (Easiest):**
```bash
cd ~/projects/kudbee-music
code .
```

This opens VS Code connected to WSL. You'll see `WSL: Ubuntu-22.04` in the bottom-left corner.

Option B: **From VS Code:**
1. Press `Ctrl+Shift+P`
2. Search for `Remote-WSL: New Window`
3. In the new window, `File → Open Folder` and navigate to `/home/your-username/projects/kudbee-music`

### Step 4: Recommended VS Code Extensions

Once in WSL mode, install these extensions:

- **Python** (Microsoft) — IntelliSense, debugging, linting
- **Pylance** (Microsoft) — Better Python analysis
- **GitLens** (GitKraken) — See git history inline
- **Thunder Client** or **REST Client** — Test APIs

Install them via the Extensions sidebar (they'll install in WSL).

### Step 5: Terminal in VS Code

The integrated terminal in VS Code will automatically use WSL bash. You can use it for git commands directly:

```bash
git status
git pull origin main
git commit -m "My changes"
git push
```

---

## Troubleshooting

### Issue: "WSL not found" or "WSL 2 not installed"

**Solution:** Make sure you're running Windows 10 Build 19041 or later. Check:
- **Settings → System → About → Windows edition**
- Run Windows Update if needed

### Issue: Git SSH authentication fails

**Solution:** Verify your SSH key is added to GitHub:
```bash
ssh -T git@github.com
```

If it fails, re-generate and add your key:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Copy to GitHub → Settings → SSH Keys
```

### Issue: "Permission denied" when cloning private repo

**Solution:** If using HTTPS, make sure your Personal Access Token has `repo` scope. If using SSH, verify the key is added to GitHub.

### Issue: VS Code can't find Python/Git

**Solution:** These must be installed in WSL Ubuntu, not Windows. Run:
```bash
sudo apt install -y python3 git
```

Then reload VS Code.

### Issue: Large file operations are slow

**Solution:** Avoid storing repos in `/mnt/c/` (Windows filesystem). Keep them in `/home/` (WSL native). This is already the case in this guide (`~/projects`).

### Issue: Need to restore a file or revert changes

**Solution:**
```bash
# See what changed:
git diff

# Discard changes to a specific file:
git checkout -- src/my-file.py

# Reset entire branch to remote (WARNING: loses local changes):
git reset --hard origin/main
```

---

## Quick Reference: Common Commands

```bash
# Clone repos
git clone https://github.com/KudbeeZero/kudbee-music.git

# Status
git status

# Pull latest
git pull origin main

# Make and commit changes
git add .
git commit -m "Your message"

# Push
git push origin main

# Create and switch to feature branch
git checkout -b feature/my-feature

# Switch branches
git checkout main

# View commit history
git log --oneline -10

# View all branches
git branch -a
```

---

## Next Steps

1. ✅ Install WSL2 and Ubuntu
2. ✅ Configure git
3. ✅ Clone repositories
4. ✅ Install and open VS Code + WSL
5. ✅ Start making changes and pushing!

You're now set up for local development while staying synced with your cloud environment. Happy coding!

---

**Questions or issues?** Check the [Troubleshooting](#troubleshooting) section above, or ask for help in your team channel.
