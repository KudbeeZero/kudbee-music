#!/usr/bin/env python3
"""
HERMES Lyric Generation Server
Inference server for LoRA-fine-tuned Mistral 7B lyric generation.

Provides Flask API endpoint for generating lyrics with HERMES constraints:
- Phonetic validation (rhyme checking)
- Theme matching
- Coherence scoring
- Confidence metrics

Usage:
  python server.py --model mistralai/Mistral-7B-Instruct-v0.1 --lora ./lora_adapter --port 8000
"""

import os
import sys
import argparse
import json
import time
from datetime import datetime
from typing import Dict, Tuple, Optional
import logging

import torch
from flask import Flask, request, jsonify
from flask_cors import CORS

from lyric_generator import LyricGenerator
from constraints import HermesConstraints

# ============================================================================
# Logging Setup
# ============================================================================
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Flask App Setup
# ============================================================================
app = Flask(__name__)
CORS(app)

# Global generator instance
generator: Optional[LyricGenerator] = None
constraints: Optional[HermesConstraints] = None

# Metrics tracking
inference_metrics = {
    "total_requests": 0,
    "successful_generations": 0,
    "failed_generations": 0,
    "total_tokens_generated": 0,
    "total_inference_time": 0.0,
    "last_generation": None,
}

# ============================================================================
# Health Check Endpoint
# ============================================================================
@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    if generator is None:
        return jsonify({"status": "error", "message": "Generator not initialized"}), 503

    return jsonify({
        "status": "healthy",
        "model_loaded": True,
        "gpu_available": torch.cuda.is_available(),
        "timestamp": datetime.now().isoformat()
    })

# ============================================================================
# Metrics Endpoint
# ============================================================================
@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """Get inference metrics."""
    avg_latency = 0
    avg_tokens_per_sec = 0

    if inference_metrics["total_requests"] > 0:
        avg_latency = inference_metrics["total_inference_time"] / inference_metrics["total_requests"]

    if inference_metrics["total_inference_time"] > 0:
        avg_tokens_per_sec = inference_metrics["total_tokens_generated"] / inference_metrics["total_inference_time"]

    return jsonify({
        "total_requests": inference_metrics["total_requests"],
        "successful_generations": inference_metrics["successful_generations"],
        "failed_generations": inference_metrics["failed_generations"],
        "average_latency_seconds": round(avg_latency, 3),
        "average_tokens_per_second": round(avg_tokens_per_sec, 1),
        "last_generation": inference_metrics["last_generation"],
        "timestamp": datetime.now().isoformat()
    })

# ============================================================================
# Main Lyric Generation Endpoint
# ============================================================================
@app.route("/api/generate", methods=["POST"])
def generate():
    """
    Generate lyrics from a prompt with HERMES constraints.

    Request JSON:
    {
        "prompt": "song lyric prompt",
        "style": "optional style tag (e.g., 'rap', 'love', 'storytelling')",
        "length": 400,  # approximate output length in characters
        "profile": "lyrics"  # HERMES profile: lyrics, poetry, rap, etc.
    }

    Response JSON:
    {
        "success": true,
        "lyrics": "generated lyrics text",
        "metadata": {
            "confidence": 0.92,
            "rhyme_score": 0.87,
            "theme_tags": ["love", "heartbreak"],
            "phonetic_validation": true,
            "inference_time_ms": 4230,
            "tokens_generated": 156
        }
    }
    """
    try:
        # Parse request
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        prompt = data.get("prompt", "").strip()
        style = data.get("style", "default")
        length = data.get("length", 400)
        profile = data.get("profile", "lyrics")

        # Validate input
        if not prompt:
            return jsonify({"error": "Prompt is required and cannot be empty"}), 400

        if len(prompt) > 500:
            return jsonify({"error": "Prompt exceeds maximum length of 500 characters"}), 400

        if length < 50 or length > 1500:
            return jsonify({"error": "Length must be between 50 and 1500 characters"}), 400

        # Track request
        inference_metrics["total_requests"] += 1
        start_time = time.time()

        logger.info(f"Generating lyrics for prompt: {prompt[:50]}... (style: {style}, profile: {profile})")

        # Generate lyrics
        generated_lyrics, num_tokens = generator.generate(
            prompt=prompt,
            max_length=length,
            style=style,
            profile=profile
        )

        # Apply HERMES constraints and validation
        validation_result = constraints.validate(
            lyrics=generated_lyrics,
            prompt=prompt,
            profile=profile
        )

        # Calculate inference metrics
        inference_time = time.time() - start_time

        # Update metrics
        inference_metrics["total_inference_time"] += inference_time
        inference_metrics["total_tokens_generated"] += num_tokens

        if validation_result["is_valid"]:
            inference_metrics["successful_generations"] += 1
        else:
            inference_metrics["failed_generations"] += 1

        inference_metrics["last_generation"] = {
            "timestamp": datetime.now().isoformat(),
            "prompt_length": len(prompt),
            "output_length": len(generated_lyrics),
            "inference_time_ms": round(inference_time * 1000, 2)
        }

        # Prepare response
        response = {
            "success": validation_result["is_valid"],
            "lyrics": generated_lyrics,
            "metadata": {
                "confidence": validation_result["confidence"],
                "rhyme_score": validation_result["rhyme_score"],
                "theme_tags": validation_result["themes"],
                "phonetic_validation": validation_result["phonetic_valid"],
                "coherence_score": validation_result["coherence"],
                "inference_time_ms": round(inference_time * 1000, 2),
                "tokens_generated": num_tokens,
                "profile": profile,
                "style": style,
                "warnings": validation_result.get("warnings", [])
            }
        }

        # Log generation
        logger.info(
            f"✅ Generated {num_tokens} tokens in {inference_time:.2f}s "
            f"(confidence: {validation_result['confidence']:.2f}, "
            f"rhyme_score: {validation_result['rhyme_score']:.2f})"
        )

        return jsonify(response), 200

    except Exception as e:
        inference_metrics["total_requests"] += 1
        inference_metrics["failed_generations"] += 1

        logger.error(f"❌ Generation failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Generation failed",
            "message": str(e)
        }), 500

# ============================================================================
# Batch Generation Endpoint
# ============================================================================
@app.route("/api/generate/batch", methods=["POST"])
def generate_batch():
    """
    Generate multiple lyrics in batch.

    Request JSON:
    {
        "prompts": [
            {"prompt": "...", "style": "...", "length": 400},
            ...
        ]
    }

    Response: Array of generation results
    """
    try:
        data = request.get_json()
        if not data or "prompts" not in data:
            return jsonify({"error": "No prompts provided"}), 400

        prompts = data.get("prompts", [])
        if not isinstance(prompts, list) or len(prompts) == 0:
            return jsonify({"error": "Prompts must be a non-empty list"}), 400

        if len(prompts) > 10:
            return jsonify({"error": "Maximum 10 prompts per batch request"}), 400

        results = []
        for prompt_data in prompts:
            # Create a simulated POST request
            request_json = {
                **prompt_data,
                "prompt": prompt_data.get("prompt", "").strip()
            }

            # Use the same generation logic (simplified for batch)
            if not request_json["prompt"]:
                results.append({"error": "Empty prompt"})
                continue

            try:
                prompt = request_json["prompt"]
                style = request_json.get("style", "default")
                length = request_json.get("length", 400)
                profile = request_json.get("profile", "lyrics")

                start_time = time.time()
                generated_lyrics, num_tokens = generator.generate(
                    prompt=prompt, max_length=length, style=style, profile=profile
                )
                validation_result = constraints.validate(
                    lyrics=generated_lyrics, prompt=prompt, profile=profile
                )

                inference_time = time.time() - start_time

                results.append({
                    "success": validation_result["is_valid"],
                    "lyrics": generated_lyrics,
                    "metadata": {
                        "confidence": validation_result["confidence"],
                        "rhyme_score": validation_result["rhyme_score"],
                        "theme_tags": validation_result["themes"],
                        "inference_time_ms": round(inference_time * 1000, 2),
                        "tokens_generated": num_tokens
                    }
                })
            except Exception as e:
                results.append({"error": str(e)})

        return jsonify({"results": results}), 200

    except Exception as e:
        logger.error(f"❌ Batch generation failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Batch generation failed",
            "message": str(e)
        }), 500

# ============================================================================
# Initialization
# ============================================================================
def initialize_generator(model_id: str, lora_path: Optional[str] = None, quantize: bool = True):
    """Initialize the lyric generator and constraints."""
    global generator, constraints

    logger.info(f"Initializing generator with model: {model_id}")
    logger.info(f"LoRA adapter path: {lora_path}")
    logger.info(f"Quantization: {quantize}")

    try:
        generator = LyricGenerator(
            model_id=model_id,
            lora_path=lora_path,
            use_4bit_quantization=quantize
        )

        constraints = HermesConstraints()

        logger.info("✅ Generator and constraints initialized successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize generator: {str(e)}", exc_info=True)
        return False

# ============================================================================
# Main
# ============================================================================
def main():
    """Entry point."""
    parser = argparse.ArgumentParser(description="HERMES Lyric Generation Server")
    parser.add_argument("--model", type=str, default="mistralai/Mistral-7B-Instruct-v0.1",
                        help="Base model ID (HuggingFace)")
    parser.add_argument("--lora", type=str, default=None,
                        help="Path to LoRA adapter directory")
    parser.add_argument("--port", type=int, default=8000,
                        help="Flask server port")
    parser.add_argument("--host", type=str, default="0.0.0.0",
                        help="Flask server host")
    parser.add_argument("--no-quantize", action="store_true",
                        help="Disable 4-bit quantization")
    parser.add_argument("--debug", action="store_true",
                        help="Enable Flask debug mode")

    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("HERMES Lyric Generation Server")
    logger.info("=" * 70)

    # Initialize generator
    if not initialize_generator(
        model_id=args.model,
        lora_path=args.lora,
        quantize=not args.no_quantize
    ):
        logger.error("Failed to initialize generator. Exiting.")
        sys.exit(1)

    # Start Flask server
    logger.info(f"Starting Flask server on {args.host}:{args.port}")
    logger.info(f"API endpoints:")
    logger.info(f"  - Health: GET /health")
    logger.info(f"  - Metrics: GET /api/metrics")
    logger.info(f"  - Generate: POST /api/generate")
    logger.info(f"  - Batch: POST /api/generate/batch")
    logger.info("=" * 70)

    app.run(host=args.host, port=args.port, debug=args.debug, threaded=False)

if __name__ == "__main__":
    main()
