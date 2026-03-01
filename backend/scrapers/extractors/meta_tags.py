from bs4 import BeautifulSoup
from .base import BaseExtractor


class MetaTagExtractor(BaseExtractor):
    """Extracts data from Open Graph tags and standard meta tags."""

    def extract(self, soup: BeautifulSoup, data: dict) -> dict:
        def og(prop):
            tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
            return tag.get("content", "").strip() if tag else None

        self._set_if_missing(data, "title", og("og:title") or og("twitter:title"))
        self._set_if_missing(data, "customer_logo_url", og("og:image") or og("twitter:image"))

        # article:published_time
        pub_time = og("article:published_time") or og("article:published") or og("date")
        if pub_time:
            self._parse_date(data, pub_time)

        # Description may contain customer name hints
        desc = og("og:description") or og("description")
        if desc:
            data.setdefault("_og_description", desc)

        return data

    def _parse_date(self, data: dict, raw: str):
        if data.get("publish_date"):
            return
        try:
            from dateutil import parser as dp
            from datetime import date
            parsed = dp.parse(raw)
            data["publish_date"] = parsed.date()
        except Exception:
            pass
