from datetime import datetime, date
from typing import Optional, List
from urllib.parse import urlparse
from pydantic import BaseModel, field_validator


class CompanyCreate(BaseModel):
    name: str
    listing_url: str
    fetcher_type: str = "static"
    case_path_prefix: Optional[str] = None
    active: bool = True


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    listing_url: Optional[str] = None
    fetcher_type: Optional[str] = None
    case_path_prefix: Optional[str] = None
    active: Optional[bool] = None


class CompanyRead(BaseModel):
    id: str
    name: str
    listing_url: str
    fetcher_type: str
    case_path_prefix: Optional[str]
    active: bool
    created_at: datetime
    last_scraped_at: Optional[datetime]
    scrape_status: str
    error_message: Optional[str]

    class Config:
        from_attributes = True


class CompanyDetailRead(CompanyRead):
    case_count: int
    avg_quality_score: float
    top_industries: list[dict]
    top_countries: list[dict]


class CaseRead(BaseModel):
    id: str
    company_id: str
    url: str
    title: Optional[str]
    customer_name: Optional[str]
    customer_industry: Optional[str]
    customer_country: Optional[str]
    customer_logo_url: Optional[str]
    challenge: Optional[str]
    solution: Optional[str]
    results: Optional[str]
    products_used: Optional[str]
    quote: Optional[str]
    quote_author: Optional[str]
    quote_author_company: Optional[str]
    publish_date: Optional[date]
    tags: Optional[str]
    first_seen: datetime
    last_checked: datetime
    content_hash: str
    raw_text: Optional[str]

    class Config:
        from_attributes = True


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    customer_name: Optional[str] = None
    customer_industry: Optional[str] = None
    customer_country: Optional[str] = None
    customer_logo_url: Optional[str] = None
    challenge: Optional[str] = None
    solution: Optional[str] = None
    results: Optional[str] = None
    products_used: Optional[str] = None
    quote: Optional[str] = None
    quote_author: Optional[str] = None
    quote_author_company: Optional[str] = None
    publish_date: Optional[date] = None
    tags: Optional[str] = None


class ScrapeRequest(BaseModel):
    company_id: str = "all"


class ScrapeJobRead(BaseModel):
    id: str
    company_id: Optional[str]
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    cases_found: int
    cases_new: int
    error: Optional[str]
    log: Optional[str] = None

    class Config:
        from_attributes = True


class StatsRead(BaseModel):
    total_companies: int
    active_companies: int
    total_cases: int
    new_cases_this_week: int
    last_scrape: Optional[datetime]
    companies_by_status: dict


class SettingsRead(BaseModel):
    llm_provider: str
    ollama_base_url: str
    ollama_model: str
    ollama_timeout: int
    openai_base_url: str
    openai_model: str
    openai_timeout: int
    scraper_enabled_fields: List[str]
    scraper_heuristic_labels: dict


def _validate_url(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    parsed = urlparse(v)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http/https URLs are allowed")
    if not parsed.hostname:
        raise ValueError("URL must include a hostname")
    return v


class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    ollama_timeout: Optional[int] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None
    openai_timeout: Optional[int] = None
    scraper_enabled_fields: Optional[List[str]] = None
    scraper_heuristic_labels: Optional[dict] = None

    @field_validator("ollama_base_url")
    @classmethod
    def validate_ollama_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url(v)

    @field_validator("openai_base_url")
    @classmethod
    def validate_openai_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url(v)

    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("none", "ollama", "openai"):
            raise ValueError("llm_provider must be 'none', 'ollama', or 'openai'")
        return v


class PaginatedCases(BaseModel):
    items: List[CaseRead]
    total: int
    page: int
    per_page: int
    pages: int


class PaginatedCompanies(BaseModel):
    items: List[CompanyRead]
    total: int
    page: int
    per_page: int
    pages: int
