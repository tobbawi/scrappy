from typing import Optional
from bs4 import BeautifulSoup
from .meta_tags import MetaTagExtractor
from .schema_org import SchemaOrgExtractor
from .heuristic import HeuristicExtractor

_PREFERRED_MODELS = ["llama3.2", "llama3", "mistral", "phi3", "phi", "gemma"]


def detect_ollama(base_url: str = "http://localhost:11434", timeout: int = 60) -> Optional[dict]:
    """
    Probe a running Ollama instance. Returns an llm_config dict if reachable
    with at least one model loaded, otherwise None.
    """
    import httpx
    try:
        r = httpx.get(f"{base_url}/api/tags", timeout=5)
        if r.status_code != 200:
            return None
        models = [m["name"] for m in r.json().get("models", [])]
        if not models:
            return None
        model = next(
            (m for pref in _PREFERRED_MODELS for m in models if m.startswith(pref)),
            models[0],
        )
        return {"enabled": True, "base_url": base_url, "model": model, "timeout": timeout}
    except Exception:
        return None


class ExtractionPipeline:
    def __init__(self, llm_config: Optional[dict] = None):
        """
        llm_config: dict with keys enabled, base_url, model, timeout.
                    If None or enabled=False, LLM step is skipped.
        """
        self.extractors = [
            MetaTagExtractor(),    # OG tags — most reliable
            SchemaOrgExtractor(),  # JSON-LD — structured
            HeuristicExtractor(),  # h1/blockquote/semantic classes — fallback
        ]
        if llm_config and llm_config.get("enabled"):
            from .llm import LLMExtractor
            self.extractors.append(LLMExtractor(
                base_url=llm_config["base_url"],
                model=llm_config["model"],
                timeout=llm_config.get("timeout", 60),
            ))

    # Fields reported in extractor events (excludes internal/raw fields)
    _TRACKED = frozenset({
        "title", "customer_name", "customer_industry", "customer_country",
        "customer_logo_url", "challenge", "solution", "results", "products_used",
        "quote", "quote_author", "quote_author_company", "publish_date", "tags",
    })

    def run(self, html: str, url: str, on_event=None) -> dict:
        import time
        soup = BeautifulSoup(html, "lxml")
        raw_text = soup.get_text(separator="\n", strip=True)
        data = {"url": url, "raw_text": raw_text[:50_000]}

        for extractor in self.extractors:
            name = type(extractor).__name__
            if on_event:
                on_event({"type": "extract_start", "extractor": name})
            before = {k for k in self._TRACKED if data.get(k)}
            t0 = time.time()
            data = extractor.extract(soup, data)
            duration_ms = int((time.time() - t0) * 1000)
            after = {k for k in self._TRACKED if data.get(k)}
            if on_event:
                on_event({
                    "type": "extract_done",
                    "extractor": name,
                    "fields_new": sorted(after - before),
                    "duration_ms": duration_ms,
                })

        data.pop("_og_description", None)
        return data
