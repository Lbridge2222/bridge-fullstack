"""
Applications Insights Router

Provides DB-grounded pipeline summaries and contextual answers for the
admissions Applications board. This avoids using RAG for numeric truth and
instead computes facts from the database, then uses the AI runtime to compose
a concise, UK HE-specific narrative.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import logging

from app.db.db import fetch
from app.ai.runtime import narrate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications/insights", tags=["applications-insights"])


class InsightsFilters(BaseModel):
    stage: Optional[str] = None
    priority: Optional[str] = None
    urgency: Optional[str] = None
    program: Optional[str] = None  # programme_name filter
    application_ids: Optional[List[str]] = None


class PipelineSummary(BaseModel):
    total: int
    avgProgression: int
    highRisk: int
    highConfidence: int
    enrollmentEstimate: float = 0.0
    stageHistogram: List[Dict[str, Any]] = Field(default_factory=list)
    programHistogram: List[Dict[str, Any]] = Field(default_factory=list)
    topBlockers: List[Dict[str, Any]] = Field(default_factory=list)
    topAtRisk: List[Dict[str, Any]] = Field(default_factory=list)


class AskRequest(BaseModel):
    query: str
    filters: Optional[InsightsFilters] = None


class AskResponse(BaseModel):
    answer: str
    summary: PipelineSummary
    sources: List[Dict[str, str]] = Field(default_factory=list)
    confidence: float = 0.9
    query_type: str = "applications_insights"


async def _load_dataset(filters: Optional[InsightsFilters]) -> List[Dict[str, Any]]:
    """Load the current applications dataset from the materialised view.

    We prefer vw_board_applications as it already joins person/programme labels
    and exposes ML fields. Fall back to an empty list on failure.
    """
    try:
        where = []
        params: List[Any] = []

        if filters and filters.stage and filters.stage != "all":
            where.append("stage = %s")
            params.append(filters.stage)
        if filters and filters.priority and filters.priority != "all":
            where.append("priority = %s")
            params.append(filters.priority)
        if filters and filters.urgency and filters.urgency != "all":
            where.append("urgency = %s")
            params.append(filters.urgency)
        if filters and filters.program and filters.program != "all":
            where.append("programme_name = %s")
            params.append(filters.program)
        if filters and filters.application_ids:
            where.append("application_id = ANY(%s::uuid[])")
            params.append(filters.application_ids)

        sql = (
            "SELECT application_id, stage, programme_name, progression_probability, "
            "       enrollment_probability, progression_blockers, recommended_actions, "
            "       first_name, last_name, last_activity_at "
            "FROM vw_board_applications "
        )
        if where:
            sql += "WHERE " + " AND ".join(where) + " "
        sql += "ORDER BY created_at DESC LIMIT 1000"

        rows = await fetch(sql, *params)
        return [dict(r) for r in rows]
    except Exception as e:
        logger.exception(f"Failed to load dataset: {e}")
        return []


def _summarise(dataset: List[Dict[str, Any]]) -> PipelineSummary:
    if not dataset:
        return PipelineSummary(
            total=0,
            avgProgression=0,
            highRisk=0,
            highConfidence=0,
            enrollmentEstimate=0.0,
            stageHistogram=[],
            programHistogram=[],
            topBlockers=[],
            topAtRisk=[],
        )

    total = len(dataset)
    probs: List[float] = []
    highRisk = 0
    highConfidence = 0
    enroll_sum = 0.0
    stage_counts: Dict[str, int] = {}
    prog_counts: Dict[str, int] = {}
    blocker_counts: Dict[str, int] = {}

    for row in dataset:
        p = row.get("progression_probability")
        if p is None:
            p = row.get("conversion_probability")  # view may expose both
        try:
            p_float = float(p or 0)
        except Exception:
            p_float = 0.0
        probs.append(p_float)
        if p_float <= 0.35:
            highRisk += 1
        if p_float >= 0.7:
            highConfidence += 1

        try:
            enroll_sum += float(row.get("enrollment_probability") or 0)
        except Exception:
            pass

        stage = (row.get("stage") or "unknown").strip()
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

        prog = (row.get("programme_name") or "unknown").strip()
        prog_counts[prog] = prog_counts.get(prog, 0) + 1

        # blockers as JSON array
        blockers = row.get("progression_blockers") or []
        try:
            if isinstance(blockers, str):
                blockers = json.loads(blockers)
        except Exception:
            blockers = []
        if isinstance(blockers, list):
            for b in blockers:
                item = (b or {}).get("item")
                if not item:
                    continue
                blocker_counts[item] = blocker_counts.get(item, 0) + 1

    avgProgression = int(round((sum(probs) / max(1, total)) * 100))

    stageHistogram = [
        {"stage": k, "count": v} for k, v in sorted(stage_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    programHistogram = [
        {"programme": k, "count": v} for k, v in sorted(prog_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    topBlockers = [
        {"item": k, "count": v} for k, v in sorted(blocker_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    # top at risk list (first_name last_name if available)
    at_risk_sorted = sorted(
        dataset,
        key=lambda r: float(r.get("progression_probability") or r.get("conversion_probability") or 0)
    )[:10]
    topAtRisk = [
        {
            "application_id": str(r.get("application_id")),
            "name": f"{(r.get('first_name') or '').strip()} {(r.get('last_name') or '').strip()}".strip() or "Unknown",
            "probability": float(r.get("progression_probability") or r.get("conversion_probability") or 0),
            "stage": r.get("stage")
        }
        for r in at_risk_sorted
    ]

    return PipelineSummary(
        total=total,
        avgProgression=avgProgression,
        highRisk=highRisk,
        highConfidence=highConfidence,
        enrollmentEstimate=round(float(enroll_sum), 2),
        stageHistogram=stageHistogram,
        programHistogram=programHistogram,
        topBlockers=topBlockers,
        topAtRisk=topAtRisk,
    )


def detect_query_intent(query: str) -> str:
    """
    Detect the intent of the query to provide contextually relevant answers.
    Returns: 'enrolment_forecast', 'stage_analysis', 'programme_comparison',
             'blocker_analysis', 'offer_analysis', 'general_overview'
    """
    query_lower = query.lower()

    # UK HE specific terms
    if any(word in query_lower for word in ["forecast", "enrolment", "enrol", "yield", "projected", "how many", "numbers"]):
        return "enrolment_forecast"
    elif any(word in query_lower for word in ["stage", "stuck", "bottleneck", "where are", "which stage", "pipeline"]):
        return "stage_analysis"
    elif any(word in query_lower for word in ["programme", "program", "course", "which programme", "best performing"]):
        return "programme_comparison"
    elif any(word in query_lower for word in ["blocker", "problem", "issue", "risk", "concern", "stopping"]):
        return "blocker_analysis"
    elif any(word in query_lower for word in ["offer", "conditional", "unconditional", "firm", "insurance", "ucas"]):
        return "offer_analysis"
    elif any(word in query_lower for word in ["health", "overview", "summary", "general", "status"]):
        return "general_overview"
    else:
        return "general_overview"


def build_he_specific_context(summary: PipelineSummary, intent: str) -> Dict[str, Any]:
    """
    Build UK Higher Education-specific context for the LLM based on query intent.
    """
    base_context = {
        "total": summary.total,
        "avg_progression": summary.avgProgression,
        "high_risk": summary.highRisk,
        "high_confidence": summary.highConfidence,
        "enrolment_estimate": summary.enrollmentEstimate,
        "top_blockers": summary.topBlockers[:3],
        "top_at_risk": summary.topAtRisk[:5],
    }

    # Add intent-specific context
    if intent == "enrolment_forecast":
        base_context["forecast_details"] = {
            "projected_enrolment": summary.enrollmentEstimate,
            "conversion_rate": f"{(summary.enrollmentEstimate / max(1, summary.total) * 100):.1f}%",
            "high_confidence_count": summary.highConfidence,
            "at_risk_count": summary.highRisk,
        }

    elif intent == "stage_analysis":
        base_context["stage_details"] = {
            "top_stages": summary.stageHistogram[:8],
            "total_stages": len(summary.stageHistogram),
            "offer_stages": [s for s in summary.stageHistogram if "offer" in s.get("stage", "").lower()],
        }

    elif intent == "programme_comparison":
        base_context["programme_details"] = {
            "top_programmes": summary.programHistogram[:10],
            "total_programmes": len(summary.programHistogram),
        }

    elif intent == "blocker_analysis":
        base_context["blocker_details"] = {
            "all_blockers": summary.topBlockers,
            "blocker_affected_apps": sum(b.get("count", 0) for b in summary.topBlockers),
        }

    elif intent == "offer_analysis":
        offer_stages = [s for s in summary.stageHistogram if "offer" in s.get("stage", "").lower()]
        base_context["offer_details"] = {
            "offer_stages": offer_stages,
            "total_offers": sum(s.get("count", 0) for s in offer_stages),
            "conditional_offers": [s for s in offer_stages if "conditional" in s.get("stage", "").lower()],
            "unconditional_offers": [s for s in offer_stages if "unconditional" in s.get("stage", "").lower()],
        }

    return base_context


def build_he_system_prompt(intent: str) -> str:
    """
    Build UK Higher Education-specific system prompt based on query intent.
    Uses UK English spelling and HE terminology.
    """
    base_prompt = (
        "You are Ivy, the UK Higher Education admissions assistant. "
        "Answer using ONLY the provided pipeline statistics. "
        "Use UK English spelling (enrolment not enrollment, programme not program, organisation not organization). "
        "Be specific and concise: start with a one-sentence summary, then provide 3 bullet insights, then 3 next actions. "
    )

    intent_specific = {
        "enrolment_forecast": (
            "Focus on projected enrolment numbers, conversion rates, and yield optimisation. "
            "Reference typical UK HE benchmarks (30-40% yield is standard). "
            "Consider UCAS cycle context and clearing implications."
        ),
        "stage_analysis": (
            "Focus on stage distribution, identify bottlenecks, and highlight where applications are concentrating. "
            "Consider UK HE stages: director review, conditional/unconditional offers, ready to enrol. "
            "Flag if too many applications are stuck at offer stages (may indicate decision deadline pressure)."
        ),
        "programme_comparison": (
            "Focus on programme performance comparison. "
            "Identify strongest and weakest programmes by application volume and progression. "
            "Suggest resource reallocation if needed."
        ),
        "blocker_analysis": (
            "Focus on blockers preventing progression. "
            "Prioritise by severity and count affected applications. "
            "For UK HE context: highlight consent issues (GDPR), missing CAS (international students), deposit delays."
        ),
        "offer_analysis": (
            "Focus on conditional vs unconditional offers, response rates, and UCAS firm/insurance context. "
            "Flag if offer response rates are low (may need decision deadline reminders). "
            "Consider A-level results period (mid-August) and clearing implications."
        ),
        "general_overview": (
            "Provide a balanced overview of pipeline health. "
            "Cover total applications, progression rate, high-risk cohort, and key blockers. "
            "Frame in UK HE context with actionable recommendations."
        ),
    }

    return base_prompt + intent_specific.get(intent, intent_specific["general_overview"])


def build_he_user_prompt(query: str, context: Dict[str, Any], intent: str) -> str:
    """
    Build UK Higher Education-specific user prompt with rich context.
    """
    prompt = f"Question: {query}\n\n"
    prompt += f"Pipeline Statistics (JSON):\n{json.dumps(context, indent=2)}\n\n"
    prompt += "Rules:\n"
    prompt += "• Do not invent numbers - use only the provided statistics\n"
    prompt += "• Use UK English spelling throughout\n"
    prompt += "• Reference UK HE concepts where relevant (UCAS, conditional offers, clearing, enrolment)\n"
    prompt += "• Justify all recommendations with specific data points\n"

    return prompt


def build_uk_he_fallback(summary: PipelineSummary, intent: str) -> str:
    """
    Build UK HE-specific fallback response when LLM narration fails.
    Uses UK English spelling and HE terminology.
    """
    parts = [
        f"We have {summary.total} visible applications, avg progression {summary.avgProgression}%, "
        f"{summary.highRisk} high-risk ({int(summary.highRisk/max(1,summary.total)*100)}% of pipeline)."
    ]

    if summary.topBlockers:
        top_blocker = summary.topBlockers[0]
        parts.append(f"Top blocker: {top_blocker['item']} ({top_blocker['count']} applications)")

    # Intent-specific insights
    if intent == "enrolment_forecast":
        yield_rate = (summary.enrollmentEstimate / max(1, summary.total)) * 100
        parts.append(f"Projected enrolment: {summary.enrollmentEstimate:.0f} students ({yield_rate:.1f}% yield)")
        insights = [
            f"Yield rate of {yield_rate:.1f}% {'is below' if yield_rate < 30 else 'aligns with' if yield_rate < 40 else 'exceeds'} typical UK HE benchmarks (30-40%)",
            f"High-risk cohort ({summary.highRisk} apps) needs immediate attention to improve conversion",
            f"High-confidence applicants ({summary.highConfidence}) should be fast-tracked to enrolment",
        ]
        actions = [
            "Run targeted outreach campaign for high-risk applicants",
            "Send decision deadline reminders to conditional offer holders",
            "Fast-track high-confidence applicants through remaining stages",
        ]

    elif intent == "stage_analysis":
        top_stages = summary.stageHistogram[:3]
        stage_names = [s['stage'] for s in top_stages]
        insights = [
            f"Top stages: {', '.join(stage_names)} - check for bottlenecks",
            f"Offer stages have {sum(s['count'] for s in summary.stageHistogram if 'offer' in s.get('stage','').lower())} applications awaiting response",
            f"Director review stages may indicate capacity constraints" if any('director' in s.get('stage','').lower() for s in top_stages) else "Stage distribution appears balanced",
        ]
        actions = [
            "Review capacity at bottleneck stages",
            "Chase conditional offer responses approaching decision deadlines",
            "Consider expediting director reviews if backlogged",
        ]

    elif intent == "blocker_analysis":
        insights = [
            f"Primary blocker affects {summary.topBlockers[0]['count'] if summary.topBlockers else 0} applications",
            "Consent issues (GDPR) prevent outreach - run consent capture campaign" if any('consent' in b.get('item','').lower() for b in summary.topBlockers) else "Review blocker resolution timelines",
            "Portal engagement low - applicants may not be actively engaged" if any('portal' in b.get('item','').lower() for b in summary.topBlockers) else "Focus on top 3 blockers for maximum impact",
        ]
        actions = [
            f"Address top blocker: {summary.topBlockers[0]['item']}" if summary.topBlockers else "Review and prioritise blockers",
            "Run consent capture campaign if GDPR blocking outreach",
            "Send portal login instructions to re-engage inactive applicants",
        ]

    elif intent == "offer_analysis":
        offer_stages = [s for s in summary.stageHistogram if "offer" in s.get("stage", "").lower()]
        total_offers = sum(s.get("count", 0) for s in offer_stages)
        insights = [
            f"{total_offers} applications at offer stages (conditional/unconditional)",
            "Offer response rates may be impacted by UCAS firm/insurance decisions elsewhere",
            "Consider pre-results deposit campaigns for conditional offer holders",
        ]
        actions = [
            "Send decision deadline reminders to offer holders",
            "Run pre-results deposit campaign to secure commitments",
            "Flag unconditional offers not responded to (may have firmed elsewhere)",
        ]

    else:  # general_overview
        insights = [
            f"High-risk cohort ({summary.highRisk}) needs attention - below 35% progression probability",
            "Concentration in top stages may indicate bottleneck" if summary.stageHistogram else "Review pipeline balance",
            f"Projected enrolment ({summary.enrollmentEstimate:.0f}) suggests {'potential yield improvement needed' if summary.enrollmentEstimate < summary.total * 0.3 else 'healthy conversion trajectory'}",
        ]
        actions = [
            "Prioritise outreach to high-risk applications",
            f"Address top blocker with targeted campaign: {summary.topBlockers[0]['item']}" if summary.topBlockers else "Review and resolve blockers",
            "Review stage bottlenecks and rebalance capacity",
        ]

    answer = " ".join(parts)
    answer += "\n\n**Insights:**\n" + "\n".join([f"• {i}" for i in insights])
    answer += "\n\n**Next Actions:**\n" + "\n".join([f"• {a}" for a in actions])

    return answer


@router.post("/summary", response_model=PipelineSummary)
async def summary_ep(filters: InsightsFilters):
    dataset = await _load_dataset(filters)
    return _summarise(dataset)


@router.post("/ask", response_model=AskResponse)
async def ask_ep(req: AskRequest):
    try:
        logger.info(f"Applications insights query: {req.query}")

        dataset = await _load_dataset(req.filters)
        summary = _summarise(dataset)

        # Detect query intent for UK HE context
        intent = detect_query_intent(req.query)
        logger.info(f"Detected query intent: {intent}")

        # Build UK HE-specific context
        context = build_he_specific_context(summary, intent)

        # Build UK HE-specific prompts
        system_prompt = build_he_system_prompt(intent)
        user_prompt = build_he_user_prompt(req.query, context, intent)

        # Attempt LLM narration with correct signature
        answer = None
        try:
            logger.info("Calling narrate() with UK HE-specific prompts")

            # Call narrate with correct signature: narrate(query, person, kb_sources, ui_ctx, intent)
            result = await narrate(
                query=user_prompt,
                person=None,  # Not person-specific, this is pipeline-level
                kb_sources=None,  # We're using computed stats, not RAG
                ui_ctx={"audience": "agent", "view": "applications_pipeline", "intent": intent},
                intent=f"applications_insights_{intent}"
            )

            # Extract text from result
            if result and isinstance(result, dict):
                answer = result.get("text") or result.get("answer")
                logger.info(f"LLM narration successful, length: {len(answer) if answer else 0}")
            else:
                logger.warning(f"Unexpected narrate result format: {type(result)}")

        except Exception as e:
            logger.exception(f"LLM narration failed: {e}")
            answer = None

        # Fallback to UK HE-specific deterministic template
        if not answer:
            logger.info(f"Using UK HE fallback template for intent: {intent}")
            answer = build_uk_he_fallback(summary, intent)

        return AskResponse(answer=answer, summary=summary, confidence=0.9 if answer else 0.7)

    except Exception as e:
        logger.exception(f"Insights endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Insights failed: {str(e)}")
