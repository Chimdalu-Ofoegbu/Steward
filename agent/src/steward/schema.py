"""Decision schema — the strict contract between the LLM and the chain.

`DECISION_TOOL` is the Anthropic forced-tool JSON schema the model MUST fill;
`Decision` is the pydantic model that re-validates the tool output as a second
gate (Appendix A.3). Malformed output never reaches the chain — `decide()` in
decide.py returns None and the cycle is skipped (fail-safe, D-05).
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Allowed treasury actions for one cycle. The model proposes; deterministic code
# (Phase 4) disposes — risk limits are enforced AFTER this validates.
Action = Literal["delegate", "undelegate", "redelegate", "rebalance", "hold"]

# 1) Strict JSON schema the model MUST fill (mirrors the Decision pydantic below).
DECISION_TOOL = {
    "name": "submit_decision",
    "description": "Submit the treasury action for this cycle.",
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["action", "amount_cspr", "rationale", "confidence"],
        "properties": {
            "action": {
                "type": "string",
                "enum": ["delegate", "undelegate", "redelegate", "rebalance", "hold"],
            },
            "validator_from": {"type": "string"},
            "validator_to": {"type": "string"},
            "amount_cspr": {"type": "number", "minimum": 0},
            "rwusd_target_pct": {"type": "number", "minimum": 0, "maximum": 100},
            "rationale": {"type": "string"},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
    },
}


class Decision(BaseModel):
    """A schema-valid treasury decision. Second validation gate after the forced tool."""

    action: Action
    validator_from: Optional[str] = None
    validator_to: Optional[str] = None
    amount_cspr: float = Field(ge=0)
    rwusd_target_pct: Optional[float] = Field(default=None, ge=0, le=100)
    rationale: str
    confidence: float = Field(ge=0, le=1)
