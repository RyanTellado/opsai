"""Thin Anthropic SDK wrapper — one model, one place to add caching later.

`ANTHROPIC_API_KEY` is read lazily so missing-key errors surface at call time
(not import time), which keeps the upload route useable for the non-LLM path.
"""

from __future__ import annotations

import os

from anthropic import Anthropic

MODEL = "claude-sonnet-4-6"

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to backend/.env."
            )
        _client = Anthropic(api_key=api_key)
    return _client


def complete_text(system: str, user: str, max_tokens: int = 2048) -> str:
    """Single-turn completion. Returns the first text block of the response."""
    msg = _get_client().messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            return block.text
    raise RuntimeError("LLM returned no text content.")
