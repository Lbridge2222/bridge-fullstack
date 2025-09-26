"""
Sampling defaults and light length jitter for Ivy conversational mode.

This stays code-agnostic; import and map to your chosen LLM client.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional
import random as _random


@dataclass(frozen=True)
class IvyConversationConfig:
    temperature_min: float = 0.6
    temperature_max: float = 0.8
    top_p: float = 0.9
    presence_penalty: float = 0.6
    frequency_penalty: float = 0.2
    target_length_words_min: int = 60
    target_length_words_max: int = 120


def jitter_temperature(cfg: IvyConversationConfig, rng: Optional[_random.Random] = None) -> float:
    rng = rng or _random
    return rng.uniform(cfg.temperature_min, cfg.temperature_max)


def jitter_target_length_words(cfg: IvyConversationConfig, rng: Optional[_random.Random] = None) -> int:
    rng = rng or _random
    return rng.randrange(cfg.target_length_words_min, cfg.target_length_words_max + 1)


def build_sampling_args(cfg: Optional[IvyConversationConfig] = None, *, rng: Optional[_random.Random] = None) -> Dict[str, float]:
    """Return a dict of sampling parameters with light per-request jitter.

    Keys chosen to be generic: temperature, top_p, presence_penalty, frequency_penalty.
    A caller may also read `target_length_words` to guide truncation, not as a hard limit.
    """
    cfg = cfg or IvyConversationConfig()
    temp = jitter_temperature(cfg, rng)
    length_words = jitter_target_length_words(cfg, rng)
    return {
        "temperature": float(temp),
        "top_p": float(cfg.top_p),
        "presence_penalty": float(cfg.presence_penalty),
        "frequency_penalty": float(cfg.frequency_penalty),
        "target_length_words": int(length_words),
    }


