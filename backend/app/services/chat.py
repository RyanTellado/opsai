"""Chat service — single-dataset Q&A via Anthropic tool-use.

Backend is stateless across turns. The frontend sends `{message, history}`
where history is the list of prior `{role: "user"|"assistant", content: str}`
pairs. The backend assembles the Anthropic-format messages list for the
current turn, runs the tool-use loop (max 5 iterations per turn), and
returns `{answer, trace}` where trace is the ordered list of tool calls
the assistant made within this turn.
"""

from __future__ import annotations

import math
from typing import Any

from app.agent.prompts import CHAT_SYSTEM_PROMPT
from app.services import llm
from app.tools import registry
from app.tools.schema import TOOLS


def _json_safe(value: Any) -> Any:
    """Recursively coerce a tool result into JSON-serializable form.

    Starlette's JSON encoder uses allow_nan=False, so NaN/Infinity floats
    must be converted to None before they hit the response boundary. Also
    coerces numpy/pandas scalars via .item() and falls back to str() for
    anything exotic.
    """
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if hasattr(value, "item"):
        try:
            return _json_safe(value.item())
        except Exception:
            pass
    return str(value)

MAX_ITERATIONS = 7  # CLAUDE.md said 5; bumped to 7 after broad analytical questions
                    # were exhausting the budget. Each iteration can fan out to N
                    # parallel tool calls, so 7 rounds is still bounded cost.
MAX_TOKENS = 2048


def chat_turn(
    dataset_id: str,
    message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    history = history or []
    messages: list[dict[str, Any]] = []
    for h in history:
        role = h.get("role")
        content = h.get("content")
        if role in ("user", "assistant") and isinstance(content, str) and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    client = llm._get_client()
    trace: list[dict[str, Any]] = []
    interim_texts: list[str] = []  # model "thinking" text emitted alongside tool calls
    final_text: str | None = None
    hit_cap = True

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=llm.MODEL,
            max_tokens=MAX_TOKENS,
            system=CHAT_SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        assistant_blocks = list(response.content)
        messages.append({"role": "assistant", "content": assistant_blocks})

        turn_text = "\n".join(
            b.text for b in assistant_blocks if getattr(b, "type", None) == "text"
        ).strip()

        if response.stop_reason != "tool_use":
            final_text = turn_text
            hit_cap = False
            break

        if turn_text:
            interim_texts.append(turn_text)

        tool_results: list[dict[str, Any]] = []
        for block in assistant_blocks:
            if getattr(block, "type", None) != "tool_use":
                continue
            entry: dict[str, Any] = {
                "tool": block.name,
                "input": _json_safe(block.input or {}),
            }
            try:
                raw_result = registry.dispatch(block.name, dataset_id, block.input or {})
                result = _json_safe(raw_result)
                entry["output"] = result
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": _stringify(result),
                    }
                )
            except Exception as e:
                err = f"{type(e).__name__}: {e}"
                entry["error"] = err
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": err,
                        "is_error": True,
                    }
                )
            trace.append(entry)

        messages.append({"role": "user", "content": tool_results})

    if final_text:
        answer = final_text
    elif interim_texts:
        notice = (
            f"_(Reached the {MAX_ITERATIONS}-round tool budget before finishing. "
            "Partial findings below — ask a more specific follow-up to drill in.)_"
        )
        answer = "\n\n".join(interim_texts) + "\n\n" + notice
    else:
        answer = (
            f"I made {len(trace)} tool call(s) but couldn't synthesize an answer "
            f"within {MAX_ITERATIONS} rounds. Try a more specific question or "
            "break it into parts."
        )

    return {"answer": answer.strip(), "trace": trace}


def _stringify(payload: Any) -> str:
    import json

    try:
        return json.dumps(payload, default=str)
    except Exception:
        return str(payload)
