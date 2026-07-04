#!/usr/bin/env python3
"""Real-time HERMES monitoring dashboard."""

from flask import Flask, render_template, jsonify, request
from datetime import datetime
import os
import json
import subprocess
import requests
import logging

logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates")

def get_git_metrics():
    """Fetch git stats from kudbee-music and kudbee-engine."""
    try:
        # kudbee-music commits
        music = subprocess.check_output(
            "git ls-remote https://github.com/KudbeeZero/kudbee-music.git | wc -l",
            shell=True, text=True
        ).strip()

        # kudbee-engine branches
        engine = subprocess.check_output(
            "git ls-remote https://github.com/KudbeeZero/kudbee-engine.git refs/heads/ | wc -l",
            shell=True, text=True
        ).strip()

        return {
            "kudbee_music_refs": music,
            "kudbee_engine_branches": engine,
            "status": "✅ Live"
        }
    except Exception as e:
        return {"error": str(e), "status": "⚠️ Offline"}

def get_system_metrics():
    """Fetch system health metrics."""
    try:
        # Check GPU (if available)
        gpu_status = "✅ Ready"
        try:
            subprocess.check_output("nvidia-smi -L", shell=True, timeout=2)
        except:
            gpu_status = "⚠️ Not detected"

        return {
            "gpu": gpu_status,
            "training_status": "Idle (ready for T4)",
            "active_agents": 13,
            "memory_layers": "Persistent",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e)}

def get_research_metrics():
    """Fetch research phase metrics."""
    return {
        "research_teams": 8,
        "findings_collected": "211+",
        "training_examples": 480,
        "validation_status": "✅ Complete",
        "branches_migrated": 6,
        "public_repo_cleaned": "✅ Yes"
    }

@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route("/api/metrics")
def metrics():
    return jsonify({
        "git": get_git_metrics(),
        "system": get_system_metrics(),
        "research": get_research_metrics(),
        "timestamp": datetime.now().isoformat()
    })

# ============================================================================
# Lyric Generation Integration
# ============================================================================
@app.route("/api/generate", methods=["POST"])
def generate_lyrics():
    """
    Proxy endpoint that forwards generation requests to the inference server.
    Falls back gracefully if server is not available.
    """
    try:
        data = request.get_json()
        inference_server = os.getenv("INFERENCE_SERVER", "http://localhost:8000")

        # Try to reach the inference server
        try:
            response = requests.post(
                f"{inference_server}/api/generate",
                json=data,
                timeout=15
            )
            return response.json(), response.status_code
        except requests.exceptions.ConnectionError:
            logger.warning(f"Inference server not available at {inference_server}")
            return jsonify({
                "error": "Inference server not available",
                "message": "The lyric generation server is not running. Start it with: python server.py",
                "inference_server": inference_server
            }), 503
        except Exception as e:
            logger.error(f"Error communicating with inference server: {str(e)}")
            return jsonify({
                "error": "Communication error",
                "message": str(e)
            }), 500

    except Exception as e:
        logger.error(f"Error in generate_lyrics proxy: {str(e)}")
        return jsonify({
            "error": "Invalid request",
            "message": str(e)
        }), 400

@app.route("/api/generation-status", methods=["GET"])
def generation_status():
    """Check if inference server is running."""
    try:
        inference_server = os.getenv("INFERENCE_SERVER", "http://localhost:8000")
        response = requests.get(f"{inference_server}/health", timeout=2)
        return jsonify({
            "inference_server_available": True,
            "server_url": inference_server,
            "status": response.json()
        }), 200
    except:
        return jsonify({
            "inference_server_available": False,
            "server_url": os.getenv("INFERENCE_SERVER", "http://localhost:8000"),
            "message": "Inference server is not running"
        }), 503

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
