import hashlib
from datetime import datetime
from typing import Optional
from .fetcher import fetch
from .extractors.pipeline import ExtractionPipeline
from models import ReferenceCase


def _make_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:12]


def _content_hash(html: str) -> str:
    return hashlib.md5(html.encode()).hexdigest()


def build_case_from_data(data: dict, company_id: str, html: str) -> Optional[ReferenceCase]:
    """Build a ReferenceCase from already-extracted data dict + raw html."""
    url = data.get("url")
    if not url:
        return None
    now = datetime.utcnow()
    return ReferenceCase(
        id=_make_id(url),
        company_id=company_id,
        url=url,
        title=data.get("title"),
        customer_name=data.get("customer_name"),
        customer_industry=data.get("customer_industry"),
        customer_country=data.get("customer_country"),
        customer_logo_url=data.get("customer_logo_url"),
        challenge=data.get("challenge"),
        solution=data.get("solution"),
        results=data.get("results"),
        products_used=data.get("products_used"),
        quote=data.get("quote"),
        quote_author=data.get("quote_author"),
        quote_author_company=data.get("quote_author_company"),
        publish_date=data.get("publish_date"),
        tags=data.get("tags"),
        first_seen=now,
        last_checked=now,
        content_hash=_content_hash(html),
        raw_text=data.get("raw_text"),
    )


def scrape_case(url: str, company_id: str, fetcher_type: str = "static") -> Optional[ReferenceCase]:
    """Fetch a case page, extract structured data, return a ReferenceCase model."""
    try:
        html = fetch(url, fetcher_type)
    except Exception as e:
        print(f"[scrape_case] fetch failed for {url}: {e}")
        return None

    pipeline = ExtractionPipeline()
    data = pipeline.run(html, url)

    now = datetime.utcnow()

    return ReferenceCase(
        id=_make_id(url),
        company_id=company_id,
        url=url,
        title=data.get("title"),
        customer_name=data.get("customer_name"),
        customer_industry=data.get("customer_industry"),
        customer_country=data.get("customer_country"),
        customer_logo_url=data.get("customer_logo_url"),
        challenge=data.get("challenge"),
        solution=data.get("solution"),
        results=data.get("results"),
        products_used=data.get("products_used"),
        quote=data.get("quote"),
        quote_author=data.get("quote_author"),
        quote_author_company=data.get("quote_author_company"),
        publish_date=data.get("publish_date"),
        tags=data.get("tags"),
        first_seen=now,
        last_checked=now,
        content_hash=_content_hash(html),
        raw_text=data.get("raw_text"),
    )
