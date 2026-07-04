#!/usr/bin/env python3
"""
Test script for HERMES Lyric Generation Server.

Test the /api/generate endpoint with various prompts and profiles.
"""

import requests
import json
import time
import sys
from typing import Dict, Optional

BASE_URL = "http://localhost:8000"

# ============================================================================
# Test Prompts
# ============================================================================
TEST_PROMPTS = [
    {
        "prompt": "A song about missing someone",
        "style": "emotional",
        "profile": "lyrics",
        "length": 300
    },
    {
        "prompt": "Rap about overcoming challenges",
        "style": "motivational",
        "profile": "rap",
        "length": 350
    },
    {
        "prompt": "Love story in the rain",
        "style": "romantic",
        "profile": "storytelling",
        "length": 400
    },
    {
        "prompt": "Life is a journey",
        "style": "introspective",
        "profile": "poetry",
        "length": 250
    },
]

# ============================================================================
# Test Functions
# ============================================================================
def test_health() -> bool:
    """Test health check endpoint."""
    try:
        print("Testing /health endpoint...")
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"   GPU available: {data.get('gpu_available')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_metrics() -> bool:
    """Test metrics endpoint."""
    try:
        print("Testing /api/metrics endpoint...")
        response = requests.get(f"{BASE_URL}/api/metrics", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Metrics retrieved")
            print(f"   Total requests: {data.get('total_requests')}")
            print(f"   Successful: {data.get('successful_generations')}")
            print(f"   Failed: {data.get('failed_generations')}")
            print(f"   Avg latency: {data.get('average_latency_seconds'):.3f}s")
            return True
        else:
            print(f"❌ Metrics failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Metrics error: {str(e)}")
        return False

def test_generate(test_data: Dict) -> Optional[Dict]:
    """Test lyric generation endpoint."""
    try:
        prompt = test_data.get("prompt", "")
        style = test_data.get("style", "default")
        profile = test_data.get("profile", "lyrics")
        length = test_data.get("length", 400)

        print(f"\nGenerating lyrics...")
        print(f"  Prompt: {prompt}")
        print(f"  Style: {style}")
        print(f"  Profile: {profile}")
        print(f"  Length: {length}")

        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "prompt": prompt,
                "style": style,
                "profile": profile,
                "length": length
            },
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"\n✅ Generation successful")
                print(f"\nGenerated Lyrics:")
                print("=" * 60)
                print(data.get("lyrics", ""))
                print("=" * 60)

                metadata = data.get("metadata", {})
                print(f"\nMetadata:")
                print(f"  Confidence: {metadata.get('confidence', 0):.2f}")
                print(f"  Rhyme Score: {metadata.get('rhyme_score', 0):.2f}")
                print(f"  Coherence: {metadata.get('coherence_score', 0):.2f}")
                print(f"  Theme Tags: {metadata.get('theme_tags', [])}")
                print(f"  Inference Time: {metadata.get('inference_time_ms', 0):.0f}ms")
                print(f"  Tokens Generated: {metadata.get('tokens_generated', 0)}")
                if metadata.get("warnings"):
                    print(f"  Warnings: {metadata.get('warnings')}")

                return data
            else:
                print(f"❌ Generation returned success=false")
                print(f"   Metadata: {data.get('metadata', {})}")
                return None
        else:
            print(f"❌ Generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Generation error: {str(e)}")
        return None

def test_batch_generate(test_data_list: list) -> bool:
    """Test batch generation endpoint."""
    try:
        print(f"\nTesting batch generation with {len(test_data_list)} prompts...")

        response = requests.post(
            f"{BASE_URL}/api/generate/batch",
            json={"prompts": test_data_list},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            successful = sum(1 for r in results if r.get("success", False))

            print(f"✅ Batch generation complete")
            print(f"   Total: {len(results)}, Successful: {successful}")

            for i, result in enumerate(results):
                if result.get("success"):
                    lyrics_preview = result.get("lyrics", "")[:80].replace("\n", " ")
                    print(f"   [{i+1}] ✅ {lyrics_preview}...")
                else:
                    print(f"   [{i+1}] ❌ Error: {result.get('error', 'Unknown')}")

            return True
        else:
            print(f"❌ Batch generation failed: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Batch generation error: {str(e)}")
        return False

# ============================================================================
# Main Test Suite
# ============================================================================
def main():
    """Run all tests."""
    print("=" * 70)
    print("HERMES Lyric Generation Server - Test Suite")
    print("=" * 70)
    print(f"Target: {BASE_URL}\n")

    # Check server connectivity
    try:
        requests.get(f"{BASE_URL}/health", timeout=2)
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to server at {BASE_URL}")
        print(f"   Make sure the server is running:")
        print(f"   python server.py --model mistralai/Mistral-7B-Instruct-v0.1 --lora ./lora_adapter")
        sys.exit(1)

    # Run tests
    results = {
        "health": test_health(),
        "metrics": test_metrics(),
    }

    # Test individual generations
    print("\n" + "=" * 70)
    print("Testing Individual Generations")
    print("=" * 70)

    generation_results = []
    for i, test_prompt in enumerate(TEST_PROMPTS, 1):
        print(f"\n[Test {i}/{len(TEST_PROMPTS)}]")
        result = test_generate(test_prompt)
        generation_results.append(result is not None)
        if i < len(TEST_PROMPTS):
            time.sleep(2)  # Wait between requests

    results["generations"] = all(generation_results) if generation_results else False

    # Test batch generation
    print("\n" + "=" * 70)
    print("Testing Batch Generation")
    print("=" * 70)
    results["batch"] = test_batch_generate(TEST_PROMPTS[:2])

    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")

    all_passed = all(results.values())
    print("=" * 70)
    if all_passed:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
