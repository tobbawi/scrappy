from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


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
    ollama_enabled: bool
    ollama_base_url: str
    ollama_model: str
    ollama_timeout: int

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    ollama_enabled: Optional[bool] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    ollama_timeout: Optional[int] = None


class PaginatedCases(BaseModel):
    items: List[CaseRead]
    total: int
    page: int
    per_page: int
    pages: int
