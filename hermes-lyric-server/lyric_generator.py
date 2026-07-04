"""
HERMES Lyric Generator
Core inference logic for generating lyrics using LoRA-fine-tuned Mistral 7B.

Features:
- 4-bit quantization for efficient inference
- LoRA adapter loading and merging
- Token-efficient generation with flash attention
- Multiple profile support (lyrics, poetry, rap, etc.)
- Style-aware prompt templating
"""

import os
import logging
from typing import Tuple, Optional
import time

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TextIteratorStreamer,
)
from peft import PeftModel

logger = logging.getLogger(__name__)

# ============================================================================
# Profile Templates
# ============================================================================
PROFILE_TEMPLATES = {
    "lyrics": {
        "system": "You are an expert lyricist specializing in modern songwriting. Generate creative, emotionally resonant song lyrics.",
        "format": "[VERSE]\n{content}\n[CHORUS]\n{chorus}"
    },
    "poetry": {
        "system": "You are a poet creating meaningful verse. Generate structured poetic lines with strong imagery.",
        "format": "{content}"
    },
    "rap": {
        "system": "You are a hip-hop writer known for clever wordplay and rhythmic flow. Generate rap lyrics with strong cadence and rhyme schemes.",
        "format": "[VERSE 1]\n{content}\n[HOOK]\n{hook}"
    },
    "storytelling": {
        "system": "You are a narrative songwriter. Generate song lyrics that tell a compelling story.",
        "format": "[VERSE]\n{content}"
    },
}

# ============================================================================
# Lyric Generator Class
# ============================================================================
class LyricGenerator:
    """Generate lyrics using a LoRA-fine-tuned Mistral model."""

    def __init__(
        self,
        model_id: str = "mistralai/Mistral-7B-Instruct-v0.1",
        lora_path: Optional[str] = None,
        use_4bit_quantization: bool = True,
        device: str = "auto",
    ):
        """
        Initialize the lyric generator.

        Args:
            model_id: HuggingFace model ID (base model)
            lora_path: Path to LoRA adapter directory (optional)
            use_4bit_quantization: Use 4-bit quantization for efficiency
            device: Device to load model on ('auto', 'cuda', 'cpu')
        """
        self.model_id = model_id
        self.lora_path = lora_path
        self.device = device
        self.model = None
        self.tokenizer = None

        logger.info(f"Initializing LyricGenerator with model: {model_id}")

        # Load tokenizer
        self._load_tokenizer()

        # Load model with optional quantization
        self._load_model(use_4bit_quantization)

        # Load and merge LoRA adapter if provided
        if lora_path and os.path.exists(lora_path):
            self._load_lora_adapter(lora_path)
        else:
            logger.warning("No LoRA adapter path provided. Using base model only.")

        logger.info("✅ LyricGenerator initialized successfully")

    def _load_tokenizer(self):
        """Load the tokenizer."""
        logger.info(f"Loading tokenizer from {self.model_id}")
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_id,
            trust_remote_code=True,
        )
        self.tokenizer.pad_token = self.tokenizer.eos_token
        logger.info(f"Tokenizer loaded. Vocab size: {len(self.tokenizer)}")

    def _load_model(self, use_4bit: bool):
        """Load the base model with optional 4-bit quantization."""
        logger.info(f"Loading model from {self.model_id}...")

        if use_4bit:
            logger.info("Using 4-bit quantization for efficiency")
            # 4-bit quantization config
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )

            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                quantization_config=bnb_config,
                device_map=self.device,
                trust_remote_code=True,
                torch_dtype=torch.bfloat16,
                attn_implementation="flash_attention_2" if self._has_flash_attention() else "eager",
            )
        else:
            logger.info("Loading model without quantization")
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                device_map=self.device,
                trust_remote_code=True,
                torch_dtype=torch.bfloat16,
                attn_implementation="flash_attention_2" if self._has_flash_attention() else "eager",
            )

        self.model.eval()
        logger.info(f"✅ Model loaded on device: {self.model.device}")

    def _load_lora_adapter(self, lora_path: str):
        """Load and merge LoRA adapter."""
        logger.info(f"Loading LoRA adapter from {lora_path}")

        try:
            # Load LoRA adapter
            self.model = PeftModel.from_pretrained(self.model, lora_path)

            # Merge LoRA into base model for inference optimization
            logger.info("Merging LoRA adapter into base model...")
            self.model = self.model.merge_and_unload()

            logger.info("✅ LoRA adapter loaded and merged successfully")
        except Exception as e:
            logger.error(f"Failed to load LoRA adapter: {str(e)}")
            raise

    def _has_flash_attention(self) -> bool:
        """Check if flash attention is available."""
        try:
            import flash_attn  # noqa
            logger.info("✅ Flash Attention available")
            return True
        except ImportError:
            logger.info("⚠️ Flash Attention not available, using eager attention")
            return False

    def generate(
        self,
        prompt: str,
        max_length: int = 400,
        style: str = "default",
        profile: str = "lyrics",
        temperature: float = 0.85,
        top_p: float = 0.95,
        top_k: int = 50,
    ) -> Tuple[str, int]:
        """
        Generate lyrics from a prompt.

        Args:
            prompt: Input prompt
            max_length: Approximate output length in characters
            style: Style tag (e.g., 'rap', 'love', 'storytelling')
            profile: HERMES profile (lyrics, poetry, rap, storytelling)
            temperature: Sampling temperature (lower = more deterministic)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter

        Returns:
            Tuple of (generated_lyrics, num_tokens_generated)
        """
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model or tokenizer not initialized")

        logger.debug(f"Generating lyrics with profile={profile}, style={style}")

        # Estimate token target from character length
        # Rough approximation: 1 token ≈ 4 characters
        max_tokens = max(50, min(512, max_length // 4))

        # Format prompt with style and profile context
        formatted_prompt = self._format_prompt(prompt, style, profile)

        logger.debug(f"Formatted prompt: {formatted_prompt[:100]}...")

        # Tokenize
        inputs = self.tokenizer(
            formatted_prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        ).to(self.model.device)

        # Generate
        start_time = time.time()

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                min_new_tokens=20,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                # Attention parameters
                repetition_penalty=1.15,
                length_penalty=1.0,
            )

        gen_time = time.time() - start_time

        # Decode
        generated_text = self.tokenizer.decode(
            outputs[0],
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True
        )

        # Strip [INST]...[/INST] wrapper if present (Mistral instruction format)
        if "[/INST]" in generated_text:
            generated_text = generated_text.split("[/INST]", 1)[-1].strip()

        # Count actual tokens generated
        num_tokens_generated = outputs[0].shape[0] - inputs["input_ids"].shape[1]

        logger.info(
            f"✅ Generated {num_tokens_generated} tokens in {gen_time:.2f}s "
            f"({num_tokens_generated / gen_time:.1f} tokens/sec)"
        )

        return generated_text, num_tokens_generated

    def _format_prompt(self, prompt: str, style: str, profile: str) -> str:
        """Format prompt with profile template and style context."""
        template = PROFILE_TEMPLATES.get(profile, PROFILE_TEMPLATES["lyrics"])
        system_msg = template.get("system", "")

        # Build instruction prompt in Mistral format
        if style and style != "default":
            instruction = f"{system_msg}\n\nStyle: {style}\n\nPrompt: {prompt}"
        else:
            instruction = f"{system_msg}\n\nPrompt: {prompt}"

        # Mistral instruction format
        formatted = f"<s>[INST] {instruction} [/INST]\n"

        return formatted

    def generate_batch(
        self,
        prompts: list,
        max_length: int = 400,
        profile: str = "lyrics",
    ) -> list:
        """
        Generate lyrics for multiple prompts (experimental).

        Args:
            prompts: List of prompt strings
            max_length: Output length in characters
            profile: HERMES profile

        Returns:
            List of (lyrics, tokens) tuples
        """
        results = []
        for prompt in prompts:
            try:
                lyrics, tokens = self.generate(
                    prompt=prompt,
                    max_length=max_length,
                    profile=profile
                )
                results.append((lyrics, tokens))
            except Exception as e:
                logger.error(f"Failed to generate for prompt '{prompt[:30]}...': {str(e)}")
                results.append((None, 0))

        return results
