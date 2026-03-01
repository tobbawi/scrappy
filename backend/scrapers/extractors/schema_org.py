import json
from bs4 import BeautifulSoup
from .base import BaseExtractor


class SchemaOrgExtractor(BaseExtractor):
    """Extracts data from JSON-LD Schema.org markup."""

    def extract(self, soup: BeautifulSoup, data: dict) -> dict:
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                payload = json.loads(script.string or "")
            except (json.JSONDecodeError, TypeError):
                continue

            items = payload if isinstance(payload, list) else [payload]
            for item in items:
                self._process_item(item, data)

        return data

    def _process_item(self, item: dict, data: dict):
        if not isinstance(item, dict):
            return

        schema_type = item.get("@type", "")
        if isinstance(schema_type, list):
            schema_type = " ".join(schema_type)

        # Article / BlogPosting / NewsArticle
        if any(t in schema_type for t in ("Article", "BlogPosting", "NewsArticle")):
            self._set_if_missing(data, "title", item.get("headline") or item.get("name"))
            raw_date = item.get("datePublished") or item.get("dateCreated")
            if raw_date:
                self._parse_date(data, raw_date)

            author = item.get("author")
            if isinstance(author, dict):
                self._set_if_missing(data, "quote_author", author.get("name"))
            elif isinstance(author, str):
                self._set_if_missing(data, "quote_author", author)

        # Organization
        if "Organization" in schema_type:
            self._set_if_missing(data, "quote_author_company", item.get("name"))
            logo = item.get("logo")
            if isinstance(logo, dict):
                self._set_if_missing(data, "customer_logo_url", logo.get("url"))
            elif isinstance(logo, str):
                self._set_if_missing(data, "customer_logo_url", logo)

        # Recurse into @graph
        for graph_item in item.get("@graph", []):
            self._process_item(graph_item, data)

    def _parse_date(self, data: dict, raw: str):
        if data.get("publish_date"):
            return
        try:
            from dateutil import parser as dp
            data["publish_date"] = dp.parse(raw).date()
        except Exception:
            pass
