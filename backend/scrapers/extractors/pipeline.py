from typing import Optional
from bs4 import BeautifulSoup
from .meta_tags import MetaTagExtractor
from .schema_org import SchemaOrgExtractor
from .heuristic import HeuristicExtractor


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

    def run(self, html: str, url: str) -> dict:
        soup = BeautifulSoup(html, "lxml")
        raw_text = soup.get_text(separator="\n", strip=True)
        data = {"url": url, "raw_text": raw_text[:50_000]}

        for extractor in self.extractors:
            data = extractor.extract(soup, data)

        data.pop("_og_description", None)
        return data
