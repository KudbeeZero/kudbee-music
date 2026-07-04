"""
HERMES Constraints & Validation
Phonetic validation, theme matching, and coherence scoring for generated lyrics.

Implements:
- Rhyme pattern detection via phoneme analysis
- Theme/belief alignment checking
- Coherence scoring
- Lyrical quality metrics
"""

import re
import logging
from typing import Dict, List, Tuple, Optional
from collections import Counter

logger = logging.getLogger(__name__)

# ============================================================================
# Phoneme Database (CMU Pronouncing Dict simplified)
# ============================================================================
PHONEME_ENDINGS = {
    # Vowel sounds (simplified phonemes)
    "ee": ["e", "iy"],  # "be", "see", "tree"
    "ay": ["eɪ", "ay"],  # "say", "way", "day"
    "ow": ["oʊ", "ow"],  # "go", "flow", "show"
    "oo": ["u", "uw"],  # "blue", "true", "new"
    "or": ["ɔr", "or"],  # "or", "for", "more"
    "ar": ["ɑr", "ar"],  # "car", "far", "star"
    "er": ["ər", "er"],  # "better", "water"
    "in": ["ɪn", "in"],  # "in", "win", "sin"
    "an": ["æn", "an"],  # "can", "pan", "man"
    "ung": ["ʌŋ", "ung"],  # "sing", "ring", "thing"
    "ack": ["æk", "ack"],  # "back", "black", "track"
    "old": ["oʊld", "old"],  # "cold", "gold", "told"
    "ite": ["aɪt", "ite"],  # "light", "night", "right"
    "ound": ["aʊnd", "ound"],  # "sound", "found", "round"
}

# Theme/belief keywords
HERMES_BELIEFS = {
    "love": ["love", "heart", "soul", "together", "forever", "care", "feel", "warm", "embrace"],
    "heartbreak": ["hurt", "pain", "tears", "alone", "lost", "gone", "broken", "goodbye"],
    "empowerment": ["strong", "power", "rise", "fight", "believe", "truth", "free", "stand"],
    "storytelling": ["once", "then", "story", "night", "day", "time", "remember", "was"],
    "introspection": ["think", "feel", "know", "believe", "want", "wonder", "question", "myself"],
    "celebration": ["happy", "joy", "party", "dance", "sing", "fun", "bright", "shine"],
}

# ============================================================================
# Rhyme Detector
# ============================================================================
class RhymeDetector:
    """Detect rhyme patterns in lyrics using phonetic analysis."""

    def __init__(self):
        """Initialize rhyme detector with phoneme database."""
        self.phoneme_endings = PHONEME_ENDINGS

    def extract_phonetic_ending(self, word: str) -> str:
        """
        Extract phonetic ending from a word (simplified).
        Uses last 2-3 characters as proxy for phoneme.
        """
        word = word.lower().strip(".,!?;:\"'")
        if len(word) < 2:
            return word

        # Try 3-char ending first, then 2-char
        if len(word) >= 3:
            ending = word[-3:]
            if ending in self.phoneme_endings:
                return ending

        if len(word) >= 2:
            ending = word[-2:]
            if ending in self.phoneme_endings:
                return ending

        return word[-2:]

    def detect_rhyme_pairs(self, lines: List[str]) -> Tuple[int, List[Tuple[int, int]]]:
        """
        Detect rhyming line pairs in lyrics.

        Returns:
            (rhyme_count, list of (line_i, line_j) pairs that rhyme)
        """
        rhyme_pairs = []

        # Extract ending words from each line
        endings = []
        for line in lines:
            words = line.split()
            if words:
                ending_word = words[-1]
                phonetic = self.extract_phonetic_ending(ending_word)
                endings.append(phonetic)

        # Find rhyme pairs
        for i in range(len(endings)):
            for j in range(i + 1, min(i + 4, len(endings))):  # Look ahead 3 lines
                # Simple rhyme: same ending
                if endings[i] == endings[j] and len(endings[i]) >= 2:
                    rhyme_pairs.append((i, j))

        return len(rhyme_pairs), rhyme_pairs

    def score_rhymes(self, lyrics: str) -> float:
        """
        Score rhyme quality (0.0 to 1.0).

        Expected rhyme density:
        - Good lyrics: ~40-60% of lines rhyme
        - Minimal: >10% rhyming lines
        """
        lines = [l.strip() for l in lyrics.split("\n") if l.strip()]

        if len(lines) < 2:
            return 0.5  # Neutral score for short text

        rhyme_count, _ = self.detect_rhyme_pairs(lines)
        expected_rhymes = max(1, len(lines) // 3)  # Expect ~1 rhyme per 3 lines

        # Score: how close to expected rhyme density
        rhyme_ratio = rhyme_count / expected_rhymes if expected_rhymes > 0 else 0
        score = min(1.0, rhyme_ratio * 0.7)  # Cap at 0.7, scale down

        # Boost score if we have some rhyming
        if rhyme_count > 0:
            score = 0.4 + (score * 0.6)

        return min(1.0, max(0.1, score))

# ============================================================================
# Theme Detector
# ============================================================================
class ThemeDetector:
    """Detect and match themes/beliefs in lyrics."""

    def __init__(self, beliefs: Dict[str, List[str]] = HERMES_BELIEFS):
        """Initialize with belief keywords."""
        self.beliefs = beliefs

    def extract_themes(self, lyrics: str) -> Dict[str, float]:
        """
        Extract themes and return confidence scores.

        Returns:
            Dict mapping theme names to confidence scores (0.0-1.0)
        """
        lyrics_lower = lyrics.lower()
        themes = {}

        for theme, keywords in self.beliefs.items():
            # Count keyword occurrences
            matches = sum(lyrics_lower.count(kw) for kw in keywords)

            # Score based on match count
            if matches > 0:
                # Normalize: expect 2-5 matches for good theme match
                confidence = min(1.0, matches / 4.0)
                themes[theme] = confidence

        return themes

    def match_prompt_themes(self, prompt: str, lyrics: str) -> float:
        """
        Score how well generated lyrics match the prompt themes.

        Returns:
            Confidence score (0.0-1.0)
        """
        prompt_themes = self.extract_themes(prompt)
        lyric_themes = self.extract_themes(lyrics)

        if not prompt_themes:
            return 0.7  # Neutral if prompt has no clear themes

        # Calculate overlap
        matched_themes = 0
        total_prompt_themes = len(prompt_themes)

        for theme, prompt_conf in prompt_themes.items():
            if theme in lyric_themes:
                matched_themes += 1

        # Score based on theme alignment
        theme_match_score = matched_themes / total_prompt_themes if total_prompt_themes > 0 else 0
        return min(1.0, 0.3 + theme_match_score * 0.7)

# ============================================================================
# Coherence Analyzer
# ============================================================================
class CoherenceAnalyzer:
    """Analyze textual coherence and lyrical quality."""

    @staticmethod
    def analyze_repetition(lyrics: str) -> float:
        """
        Analyze excessive repetition (which reduces quality).

        Returns:
            Penalty score (0.0-1.0, where 1.0 = no problematic repetition)
        """
        words = lyrics.lower().split()

        if len(words) < 5:
            return 1.0

        # Count word frequencies
        word_freq = Counter(words)

        # Penalize if any word appears too frequently
        max_freq = max(word_freq.values()) if word_freq else 0
        freq_ratio = max_freq / len(words)

        # Penalize if >20% of words are repetitions
        if freq_ratio > 0.2:
            return max(0.3, 1.0 - (freq_ratio - 0.2) * 2)

        return 1.0

    @staticmethod
    def analyze_line_variety(lyrics: str) -> float:
        """
        Analyze line length variety (good lyrics vary line lengths).

        Returns:
            Score (0.0-1.0)
        """
        lines = [l.strip() for l in lyrics.split("\n") if l.strip()]

        if len(lines) < 3:
            return 0.6

        line_lengths = [len(l) for l in lines]
        avg_length = sum(line_lengths) / len(line_lengths)

        # Calculate coefficient of variation
        if avg_length == 0:
            return 0.5

        variance = sum((l - avg_length) ** 2 for l in line_lengths) / len(line_lengths)
        std_dev = variance ** 0.5
        cv = std_dev / avg_length if avg_length > 0 else 0

        # Good variety: CV around 0.3-0.6
        if 0.2 < cv < 0.7:
            return 0.9
        elif 0.1 < cv <= 0.2 or 0.7 <= cv < 1.0:
            return 0.7
        else:
            return 0.5

    @staticmethod
    def analyze_punctuation(lyrics: str) -> float:
        """
        Ensure good use of punctuation and structure.

        Returns:
            Score (0.0-1.0)
        """
        lines = [l.strip() for l in lyrics.split("\n") if l.strip()]

        if not lines:
            return 0.5

        # Check for varied punctuation
        punctuation_count = sum(1 for line in lines if re.search(r"[.!?,;:]", line))
        punctuation_ratio = punctuation_count / len(lines)

        # Good: 30-70% of lines end with punctuation
        if 0.3 <= punctuation_ratio <= 0.7:
            return 1.0
        elif punctuation_ratio > 0:
            return 0.8
        else:
            return 0.5

    def analyze_overall(self, lyrics: str) -> float:
        """
        Compute overall coherence score.

        Returns:
            Score (0.0-1.0)
        """
        rep_score = self.analyze_repetition(lyrics)
        variety_score = self.analyze_line_variety(lyrics)
        punct_score = self.analyze_punctuation(lyrics)

        # Weighted average
        overall = (rep_score * 0.4 + variety_score * 0.4 + punct_score * 0.2)

        return min(1.0, max(0.1, overall))

# ============================================================================
# HERMES Constraints (Main Validator)
# ============================================================================
class HermesConstraints:
    """Main constraints validator for lyric generation."""

    def __init__(self):
        """Initialize constraint validators."""
        self.rhyme_detector = RhymeDetector()
        self.theme_detector = ThemeDetector()
        self.coherence_analyzer = CoherenceAnalyzer()

    def validate(
        self,
        lyrics: str,
        prompt: str = "",
        profile: str = "lyrics"
    ) -> Dict:
        """
        Validate generated lyrics against HERMES constraints.

        Args:
            lyrics: Generated lyric text
            prompt: Original prompt (for theme matching)
            profile: HERMES profile (lyrics, poetry, rap, etc.)

        Returns:
            Validation result dict with:
            - is_valid: bool
            - confidence: float (0.0-1.0)
            - rhyme_score: float (0.0-1.0)
            - coherence: float (0.0-1.0)
            - theme_tags: List[str]
            - phonetic_valid: bool
            - warnings: List[str]
        """
        warnings = []

        # 1. Rhyme validation
        rhyme_score = self.rhyme_detector.score_rhymes(lyrics)
        logger.debug(f"Rhyme score: {rhyme_score:.2f}")

        # 2. Theme matching
        themes = self.theme_detector.extract_themes(lyrics)
        theme_tags = list(themes.keys())
        theme_match_score = self.theme_detector.match_prompt_themes(prompt, lyrics)
        logger.debug(f"Theme match score: {theme_match_score:.2f}, themes: {theme_tags}")

        # 3. Coherence analysis
        coherence_score = self.coherence_analyzer.analyze_overall(lyrics)
        logger.debug(f"Coherence score: {coherence_score:.2f}")

        # 4. Basic quality checks
        is_valid = True
        phonetic_valid = True

        # Check minimum length
        if len(lyrics) < 50:
            warnings.append("Generated text is very short")
            is_valid = False

        # Check for excessive repetition
        if self.coherence_analyzer.analyze_repetition(lyrics) < 0.4:
            warnings.append("Excessive word repetition detected")
            is_valid = False

        # Check for all-caps (usually low quality)
        if sum(1 for c in lyrics if c.isupper()) / max(1, len(lyrics)) > 0.7:
            warnings.append("Excessive capitalization")
            is_valid = False

        # Combine scores
        confidence = (
            rhyme_score * 0.25 +
            theme_match_score * 0.25 +
            coherence_score * 0.5
        )

        result = {
            "is_valid": is_valid and confidence > 0.3,
            "confidence": min(1.0, max(0.0, confidence)),
            "rhyme_score": min(1.0, max(0.0, rhyme_score)),
            "coherence": min(1.0, max(0.0, coherence_score)),
            "theme_tags": theme_tags,
            "phonetic_valid": phonetic_valid,
            "themes": theme_tags,  # Alias for backward compat
            "warnings": warnings,
        }

        logger.info(
            f"Validation complete: "
            f"valid={result['is_valid']}, "
            f"confidence={result['confidence']:.2f}, "
            f"rhyme={rhyme_score:.2f}, "
            f"coherence={coherence_score:.2f}"
        )

        return result
