from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field


class Company(SQLModel, table=True):
    id: str = Field(primary_key=True)  # slugified name
    name: str
    listing_url: str
    fetcher_type: str = "static"  # static | dynamic | stealthy
    case_path_prefix: Optional[str] = None  # e.g. "/customers/"
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_scraped_at: Optional[datetime] = None
    scrape_status: str = "idle"  # idle | running | error | success
    error_message: Optional[str] = None


class ReferenceCase(SQLModel, table=True):
    id: str = Field(primary_key=True)  # sha256(url)[:12]
    company_id: str = Field(foreign_key="company.id")
    url: str = Field(unique=True)
    title: Optional[str] = None
    customer_name: Optional[str] = None
    customer_industry: Optional[str] = None
    customer_country: Optional[str] = None
    customer_logo_url: Optional[str] = None
    challenge: Optional[str] = None
    solution: Optional[str] = None
    results: Optional[str] = None
    products_used: Optional[str] = None  # JSON array stored as string
    quote: Optional[str] = None
    quote_author: Optional[str] = None
    quote_author_company: Optional[str] = None
    publish_date: Optional[date] = None
    tags: Optional[str] = None  # JSON array
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_checked: datetime = Field(default_factory=datetime.utcnow)
    content_hash: str
    raw_text: Optional[str] = None  # stored for future LLM extraction


class AppSettings(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    ollama_enabled: bool = False
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_timeout: int = 60  # seconds per LLM call


class ScrapeJob(SQLModel, table=True):
    id: str = Field(primary_key=True)
    company_id: Optional[str] = None  # None = all companies
    status: str = "queued"  # queued | running | done | failed
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    cases_found: int = 0
    cases_new: int = 0
    error: Optional[str] = None
