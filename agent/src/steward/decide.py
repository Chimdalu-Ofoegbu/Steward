"""Decision step — Anthropic forced-tool call -> guaranteed schema-valid JSON.

The model is REQUIRED to emit `submit_decision`, so the output is structured;
pydantic re-validates it as a second gate. Any refusal / non-tool / malformed
output returns None -> the loop skips the cycle with NO on-chain write (D-05,
Appendix A.3 + the fail-safe rule in A.4).
"""
from __future__ import annotations

import os
from typing import Optional

import anthropic

from .schema import DECISION_TOOL, Decision

# Default model from env (claude-opus-4-8); overridable per call.
DEFAULT_MODEL = os.environ.get("STEWARD_MODEL", "claude-opus-4-8")


async def decide(prompt: str, model: str | None = None, client=None) -> Optional[Decision]:
    """Forced-tool call: the model MUST emit submit_decision -> valid JSON.

    Returns a validated Decision, or None (malformed -> skip the cycle, NO
    on-chain action). `model` defaults to STEWARD_MODEL.
    """
    model = model or DEFAULT_MODEL
    client = client or anthropic.AsyncAnthropic()  # reads ANTHROPIC_API_KEY from env
    resp = await client.messages.create(
        model=model,
        max_tokens=1024,
        tools=[DECISION_TOOL],
        tool_choice={"type": "tool", "name": "submit_decision"},
        messages=[{"role": "user", "content": prompt}],
        # NOTE: omit temperature — Opus historically rejects it (HTTP 400) and the
        # forced tool-call needs no sampling knob.
    )
    # Find the tool_use block (a forced tool-call may be preceded by other blocks).
    raw = None
    for block in resp.content or []:
        if getattr(block, "type", None) == "tool_use":
            raw = getattr(block, "input", None)
            break
    if raw is None and resp.content:  # fallback: first block's input
        raw = getattr(resp.content[0], "input", None)
    if not isinstance(raw, dict):
        return None  # refusal / non-tool output -> malformed -> skip cycle
    try:
        return Decision(**raw)  # strict validation — second gate
    except Exception:
        return None
