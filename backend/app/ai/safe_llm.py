import asyncio, random, logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Tuple, Union

log = logging.getLogger(__name__)

try:
    from app.ai import (
        ACTIVE_MODEL,
        GEMINI_API_KEY,
        GEMINI_MODEL,
        OPENAI_API_KEY,
        OPENAI_MODEL,
        AI_TIMEOUT_MS,
        AI_TIMEOUT_MAIN_MS,
        AI_TIMEOUT_HELPER_MS,
    )
except Exception:
    # sane fallbacks so we never crash here
    ACTIVE_MODEL, GEMINI_API_KEY, OPENAI_API_KEY = "gemini", None, None
    GEMINI_MODEL, OPENAI_MODEL = "gemini-1.5-flash", "gpt-4o-mini"
    AI_TIMEOUT_MAIN_MS = 7000
    AI_TIMEOUT_HELPER_MS = 3000
    AI_TIMEOUT_MS = AI_TIMEOUT_MAIN_MS

def _normalize_gemini_model(name: str | None) -> str:
    """Normalize Gemini model names to API-key surface stable forms.
    - Strip any leading "models/" prefix
    - Pin aliases to -001 to avoid upstream remap to -002
    - Coerce -002 back to -001 for API-key compatibility
    """
    n = (name or "gemini-2.0-flash").strip()
    if n.startswith("models/"):
        n = n[7:]
    if n in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"):
        n = n + "-001"
    if n.endswith("-002") and (n.startswith("gemini-1.5-flash") or n.startswith("gemini-1.5-pro")):
        n = n[:-4] + "-001"
    return n

class LLMCtx:
    # keep both params optional and order-insensitive at callsites
    def __init__(self, temperature: float = 0.1, model: str | None = None, *, timeout_ms: int | None = None):
        self.temperature = temperature
        self.timeout_ms = timeout_ms or AI_TIMEOUT_MS
        if model:
            self.model = _normalize_gemini_model(model)
        else:
            default_model = OPENAI_MODEL if (ACTIVE_MODEL == "openai" and OPENAI_API_KEY) else GEMINI_MODEL
            self.model = _normalize_gemini_model(default_model)

    async def ainvoke(self, messages: Union[str, List[Tuple[str, str]]], max_retries: int = 2) -> str:
        last = None
        selected_model_for_attempt = None
        for attempt in range(max_retries + 1):
            try:
                if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
                    from langchain_openai import ChatOpenAI
                    selected_model_for_attempt = self.model
                    llm = ChatOpenAI(model=selected_model_for_attempt, temperature=self.temperature, api_key=OPENAI_API_KEY)
                else:
                    # Gemini via Google SDK (REST v1 API-key surface), no LangChain
                    import google.generativeai as genai
                    selected_model_for_attempt = _normalize_gemini_model(self.model)
                    # Build a plain text prompt from (role, text) pairs
                    if isinstance(messages, list):
                        prompt = "\n".join(
                            m[1] if isinstance(m, tuple) and len(m) == 2 else str(m)
                            for m in messages
                        )
                    else:
                        prompt = str(messages)

                    log.info(
                        "LLM call: provider=gemini_direct model=%s timeout_ms=%s attempt=%d",
                        selected_model_for_attempt,
                        self.timeout_ms or AI_TIMEOUT_MS,
                        attempt,
                    )
                    try:
                        genai.configure(api_key=GEMINI_API_KEY)
                        loop = asyncio.get_running_loop()

                        def _sync_call_with_model(model_name: str) -> str:
                            mdl = genai.GenerativeModel(model_name)
                            resp = mdl.generate_content(prompt)
                            return (getattr(resp, "text", "") or "").strip()

                        # Try a small set of API-key models to dodge regional alias issues
                        candidate_models = []
                        base = selected_model_for_attempt
                        if base not in candidate_models:
                            candidate_models.append(base)
                        alias = base.replace("-001", "")
                        if alias not in candidate_models:
                            candidate_models.append(alias)
                        for extra in (
                            # Prefer 2.0 family first when available in your tenant
                            "gemini-2.0-flash",
                            "gemini-2.0-flash-latest",
                            # Then 1.5 family aliases
                            "gemini-1.5-flash-latest",
                            "gemini-1.5-flash",
                            # Older fallbacks
                            "gemini-pro",
                            "gemini-1.0-pro",
                        ):
                            if extra not in candidate_models:
                                candidate_models.append(extra)

                        last_direct_err = None
                        for cand in candidate_models:
                            try:
                                log.info("LLM try candidate: %s", cand)
                                resp_text = await asyncio.wait_for(
                                    loop.run_in_executor(None, _sync_call_with_model, cand),
                                    timeout=(self.timeout_ms or AI_TIMEOUT_MS) / 1000,
                                )
                                return resp_text
                            except Exception as cand_err:
                                last_direct_err = cand_err
                                log.warning("Gemini direct candidate failed (%s): %s", cand, cand_err)
                        raise last_direct_err or RuntimeError("Gemini direct failed all candidates")
                    except Exception as direct_err:
                        last = direct_err
                        log.warning("Gemini direct failed: %s", direct_err)
                # For OpenAI path, we need to execute the LLM call
                if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
                    log.info("LLM call: provider=openai model=%s timeout_ms=%s attempt=%d", 
                             selected_model_for_attempt, self.timeout_ms or AI_TIMEOUT_MS, attempt)
                    coro = llm.ainvoke(messages if isinstance(messages, list) else [("human", messages)])
                    resp = await asyncio.wait_for(coro, timeout=(self.timeout_ms or AI_TIMEOUT_MS) / 1000)
                    return (resp.content or "").strip()
            except Exception as e:
                last = e
                # One-shot fallback: if Gemini NotFound, retry once with alias/base form directly via SDK
                msg = str(e)
                if ("NotFound" in msg or "was not found" in msg) and selected_model_for_attempt and "gemini-1.5-" in selected_model_for_attempt:
                    try:
                        import google.generativeai as genai
                        genai.configure(api_key=GEMINI_API_KEY)
                        alt = _normalize_gemini_model(selected_model_for_attempt).replace("-001", "")
                        model = genai.GenerativeModel(alt)
                        loop = asyncio.get_running_loop()
                        def _sync_retry():
                            # rebuild prompt
                            if isinstance(messages, list):
                                prmpt = "\n".join(
                                    m[1] if isinstance(m, tuple) and len(m) == 2 else str(m)
                                    for m in messages
                                )
                            else:
                                prmpt = str(messages)
                            return model.generate_content(prmpt)
                        log.warning("LLM fallback: retrying with model=%s via direct SDK", alt)
                        resp = await asyncio.wait_for(
                            loop.run_in_executor(None, _sync_retry),
                            timeout=(self.timeout_ms or AI_TIMEOUT_MS) / 1000,
                        )
                        return (getattr(resp, "text", "") or "").strip()
                    except Exception as e2:
                        last = e2
                # Final provider fallback: if Gemini fails and OpenAI is available, try OpenAI once
                if attempt == max_retries and OPENAI_API_KEY:
                    try:
                        from langchain_openai import ChatOpenAI
                        llm = ChatOpenAI(model=OPENAI_MODEL, temperature=self.temperature, api_key=OPENAI_API_KEY)
                        log.warning("LLM provider fallback: switching to OpenAI model=%s", OPENAI_MODEL)
                        coro = llm.ainvoke(messages if isinstance(messages, list) else [("human", messages)])
                        resp = await asyncio.wait_for(coro, timeout=(self.timeout_ms or AI_TIMEOUT_MS) / 1000)
                        return (resp.content or "").strip()
                    except Exception as e3:
                        last = e3
                if attempt < max_retries:
                    await asyncio.sleep(0.2 + 0.25 * attempt + random.random() * 0.2)
        log.error("LLM failed after retries: %r", last)
        return ""
