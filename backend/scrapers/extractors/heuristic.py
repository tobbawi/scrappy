import re
import json
from bs4 import BeautifulSoup, Tag
from .base import BaseExtractor

INDUSTRY_KEYWORDS = [
    "finance", "banking", "insurance", "retail", "e-commerce", "healthcare",
    "manufacturing", "technology", "telecom", "media", "education", "government",
    "energy", "logistics", "automotive", "pharma", "hospitality", "real estate",
]

CUSTOMER_SIGNAL_CLASSES = [
    "customer", "client", "company-name", "org-name", "logo-title",
    "hero-title", "case-study-title",
]

QUOTE_SIGNAL_CLASSES = [
    "quote", "testimonial", "blockquote", "pull-quote", "callout-quote",
]

RESULT_SIGNAL_CLASSES = [
    "results", "outcomes", "stats", "metrics", "impact", "achievements",
]


class HeuristicExtractor(BaseExtractor):
    """Fallback extractor using HTML structure heuristics."""

    def extract(self, soup: BeautifulSoup, data: dict) -> dict:
        self._extract_title(soup, data)
        self._extract_customer_name(soup, data)
        self._extract_quote(soup, data)
        self._extract_results(soup, data)
        self._extract_industry(soup, data)
        self._extract_publish_date(soup, data)
        self._extract_tags(soup, data)
        return data

    def _extract_title(self, soup: BeautifulSoup, data: dict):
        if data.get("title"):
            return
        h1 = soup.find("h1")
        if h1:
            self._set_if_missing(data, "title", h1.get_text(strip=True))

    def _extract_customer_name(self, soup: BeautifulSoup, data: dict):
        if data.get("customer_name"):
            return

        # Try semantic class names
        for cls in CUSTOMER_SIGNAL_CLASSES:
            el = soup.find(class_=re.compile(cls, re.I))
            if el:
                text = el.get_text(strip=True)
                if text and len(text) < 80:
                    self._set_if_missing(data, "customer_name", text)
                    return

        # Try <img alt> near "logo" class
        logo_img = soup.find("img", class_=re.compile("logo", re.I))
        if logo_img:
            alt = logo_img.get("alt", "").strip()
            if alt and len(alt) < 60:
                self._set_if_missing(data, "customer_name", alt)
                return

        # Fallback: look for patterns like "How <Company> did X"
        title = data.get("title", "") or ""
        m = re.match(r"(?:How|Why|What)\s+([A-Z][A-Za-z0-9\s&,\.]+?)\s+(?:uses?|achieve|built|saved|scaled|grew|reduced|improved)", title)
        if m:
            self._set_if_missing(data, "customer_name", m.group(1).strip())

    def _extract_quote(self, soup: BeautifulSoup, data: dict):
        if data.get("quote"):
            return

        # blockquote tags
        for bq in soup.find_all("blockquote"):
            text = bq.get_text(strip=True)
            if 20 < len(text) < 500:
                self._set_if_missing(data, "quote", text)
                # Look for cite / attribution nearby
                cite = bq.find("cite") or bq.find_next_sibling(class_=re.compile("author|attribution|name", re.I))
                if cite:
                    self._set_if_missing(data, "quote_author", cite.get_text(strip=True))
                return

        # Semantic class names
        for cls in QUOTE_SIGNAL_CLASSES:
            el = soup.find(class_=re.compile(cls, re.I))
            if el:
                text = el.get_text(strip=True)
                if 20 < len(text) < 500:
                    self._set_if_missing(data, "quote", text)
                    return

    def _extract_results(self, soup: BeautifulSoup, data: dict):
        if data.get("results"):
            return

        for cls in RESULT_SIGNAL_CLASSES:
            el = soup.find(class_=re.compile(cls, re.I))
            if el:
                text = el.get_text(" ", strip=True)
                if len(text) > 10:
                    self._set_if_missing(data, "results", text[:1000])
                    return

        # Look for h2/h3 with "results" / "outcomes" heading followed by paragraph
        for heading in soup.find_all(["h2", "h3"]):
            text = heading.get_text(strip=True).lower()
            if any(w in text for w in ["result", "outcome", "impact", "benefit"]):
                sibling = heading.find_next_sibling(["p", "ul", "div"])
                if sibling:
                    content = sibling.get_text(" ", strip=True)
                    if len(content) > 20:
                        self._set_if_missing(data, "results", content[:1000])
                        return

    def _extract_industry(self, soup: BeautifulSoup, data: dict):
        if data.get("customer_industry"):
            return

        full_text = (data.get("raw_text") or "").lower()
        for kw in INDUSTRY_KEYWORDS:
            if kw in full_text:
                self._set_if_missing(data, "customer_industry", kw.title())
                return

    def _extract_publish_date(self, soup: BeautifulSoup, data: dict):
        if data.get("publish_date"):
            return

        for el in soup.find_all(["time", "span", "p"], attrs={"datetime": True}):
            raw = el.get("datetime", "").strip()
            if raw:
                self._parse_date(data, raw)
                if data.get("publish_date"):
                    return

        # Look for date patterns in text
        date_re = re.compile(
            r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b"
            r"|\b\d{4}-\d{2}-\d{2}\b",
            re.I,
        )
        for el in soup.find_all(["span", "p", "div"], class_=re.compile("date|time|publish", re.I)):
            m = date_re.search(el.get_text())
            if m:
                self._parse_date(data, m.group(0))
                if data.get("publish_date"):
                    return

    def _extract_tags(self, soup: BeautifulSoup, data: dict):
        if data.get("tags"):
            return

        tags = set()
        for el in soup.find_all(["a", "span"], class_=re.compile(r"tag|label|badge|category|pill", re.I)):
            text = el.get_text(strip=True)
            if 2 < len(text) < 40 and not text.startswith("http"):
                tags.add(text)

        if tags:
            self._set_if_missing(data, "tags", json.dumps(sorted(tags)))

    def _parse_date(self, data: dict, raw: str):
        if data.get("publish_date"):
            return
        try:
            from dateutil import parser as dp
            data["publish_date"] = dp.parse(raw, fuzzy=True).date()
        except Exception:
            pass
