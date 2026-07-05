#!/usr/bin/env python3
"""CPU-safe tests for SCRIBE mock mode."""

import os
import sys
import json

# Enable mock mode for tests
os.environ['SCRIBE_MOCK'] = '1'

from server import (
    generate_scribe_alternatives_mock,
    build_scribe_prompt,
    parse_scribe_alternatives
)

def test_mock_alternatives_basic():
    """Test mock alternatives generation."""
    line = "Now the whole brain wakes when I open up the door"
    alts = generate_scribe_alternatives_mock(line, [])
    assert len(alts) == 3, f"Expected 3 alternatives, got {len(alts)}"
    assert all(isinstance(a, str) for a in alts), "All alternatives must be strings"
    print("✅ test_mock_alternatives_basic passed")

def test_mock_alternatives_avoid_words():
    """Test that banned words are not introduced."""
    line = "Now the whole brain wakes when I open up the door"
    avoid_words = ["echo", "shadow", "flame"]
    alts = generate_scribe_alternatives_mock(line, avoid_words)
    assert len(alts) == 3
    # Check that avoid words don't appear (case-insensitive)
    for alt in alts:
        for word in avoid_words:
            assert word.lower() not in alt.lower(), f"Found banned word '{word}' in alternative: {alt}"
    print("✅ test_mock_alternatives_avoid_words passed")

def test_build_scribe_prompt_rich_context():
    """Test building prompt from rich context."""
    data = {
        "title": "Started in the Chat",
        "theme": "songwriting",
        "mood": "determined",
        "genre": "rap",
        "section": "Chorus",
        "lineBefore": "I built this song from pieces on the floor",
        "lineToRewrite": "Now the whole brain wakes when I open up the door",
        "lineAfter": "WIFI DJ got a brain underneath",
        "avoidWords": ["echo", "shadow"],
    }
    prompt = build_scribe_prompt(data)
    assert "LINE TO REWRITE" in prompt, "Prompt must contain LINE TO REWRITE marker"
    assert data["lineToRewrite"] in prompt, "Prompt must include line to rewrite"
    assert "echo" in prompt.lower(), "Prompt must include avoid words"
    print("✅ test_build_scribe_prompt_rich_context passed")

def test_build_scribe_prompt_simple():
    """Test building prompt from simple prompt."""
    data = {"prompt": "Simple test prompt"}
    prompt = build_scribe_prompt(data)
    assert prompt == "Simple test prompt", "Simple prompt should be returned as-is"
    print("✅ test_build_scribe_prompt_simple passed")

def test_parse_scribe_alternatives_json():
    """Test parsing JSON alternatives."""
    text = '{"alternatives": ["alt1", "alt2", "alt3"]}'
    alts = parse_scribe_alternatives(text)
    assert alts == ["alt1", "alt2", "alt3"], f"Failed to parse JSON, got {alts}"
    print("✅ test_parse_scribe_alternatives_json passed")

def test_parse_scribe_alternatives_numbered():
    """Test parsing numbered alternatives."""
    text = "1. First alternative\n2. Second alternative\n3. Third alternative"
    alts = parse_scribe_alternatives(text)
    assert len(alts) >= 3, f"Failed to parse numbered alternatives, got {alts}"
    print("✅ test_parse_scribe_alternatives_numbered passed")

def test_mock_generator_uniqueness():
    """Test that mock generator returns unique alternatives."""
    line = "The quick brown fox jumps over the lazy dog"
    alts = generate_scribe_alternatives_mock(line, [])
    # Check uniqueness (case-insensitive)
    lower_alts = [a.lower() for a in alts]
    assert len(lower_alts) == len(set(lower_alts)), f"Alternatives are not unique: {alts}"
    print("✅ test_mock_generator_uniqueness passed")

if __name__ == "__main__":
    tests = [
        test_mock_alternatives_basic,
        test_mock_alternatives_avoid_words,
        test_build_scribe_prompt_rich_context,
        test_build_scribe_prompt_simple,
        test_parse_scribe_alternatives_json,
        test_parse_scribe_alternatives_numbered,
        test_mock_generator_uniqueness,
    ]

    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ {test.__name__} failed: {e}")
            sys.exit(1)

    print("\n✅ All tests passed!")
