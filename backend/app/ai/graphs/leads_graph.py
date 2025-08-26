from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel

try:
	from langgraph.graph import StateGraph, START, END
except Exception:
    # Allow running without langgraph during early scaffolding
    START = "START"  # type: ignore
    END = "END"  # type: ignore
    class StateGraph:  # type: ignore
        def __init__(self, *_: Any, **__: Any):
            self._nodes = []
        def add_node(self, *args: Any, **kwargs: Any):
            self._nodes.append((args, kwargs))
        def add_edge(self, *_: Any, **__: Any):
            pass
        def compile(self):
            class _Runner:
                def __init__(self, *_: Any, **__: Any):
                    pass
                def invoke(self, state: Any):
                    return state
            return _Runner()

from app.ai.tools.leads import sql_query_leads, leads_triage, LeadLite


class LeadState(BaseModel):
    intent: str  # "triage" | "explain" | "compose"
    filters: Dict[str, Any] = {}
    lead_ids: Optional[List[str]] = None
    leads: Optional[List[Dict[str, Any]]] = None
    triaged: Optional[List[Dict[str, Any]]] = None
    answer: Optional[Dict[str, Any]] = None


async def plan(state: LeadState) -> LeadState:
    # Placeholder – could branch later based on intent
    return state


async def fetch(state: LeadState) -> LeadState:
    leads = await sql_query_leads(state.filters or {})
    return state.model_copy(update={"leads": [l.model_dump() for l in leads]})


async def triage(state: LeadState) -> LeadState:
    leads_models = [LeadLite(**l) for l in (state.leads or [])]
    ranked = await leads_triage(leads_models)
    return state.model_copy(update={"triaged": ranked})


def _top_reasons(items: List[Dict[str, Any]]) -> List[str]:
    from collections import Counter
    c: Counter[str] = Counter()
    for it in items:
        for r in it.get("reasons", [])[:3]:
            c[r] += 1
    return [r for r, _ in c.most_common(5)]


async def answer(state: LeadState) -> LeadState:
    if state.intent == "triage":
        summary = {
            "cohort_size": len(state.leads or []),
            "top_reasons": _top_reasons(state.triaged or []),
        }
        return state.model_copy(update={"answer": {"summary": summary, "triaged": state.triaged}})
    return state


graph = StateGraph(LeadState)
graph.add_node("plan", plan)
graph.add_node("fetch", fetch)
graph.add_node("triage", triage)
graph.add_node("answer", answer)
graph.add_edge(START, "plan")
graph.add_edge("plan", "fetch")
graph.add_edge("fetch", "triage")
graph.add_edge("triage", "answer")
graph.add_edge("answer", END)
lead_graph = graph.compile()


