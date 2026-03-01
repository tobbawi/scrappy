# Architecture Overview

## System Purpose

Scrappy is a local web application that tracks reference cases (customer success stories)
from 60+ company websites. It scrapes, stores, and surfaces structured case data through
a searchable interface and a weekly digest.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.115, Python 3.14 |
| ORM / DB | SQLModel 0.0.37 + SQLAlchemy 2.0.47 + SQLite |
| Web scraping | httpx (static), Playwright 1.58 (dynamic/stealthy) |
| HTML parsing | BeautifulSoup4 |
| Task scheduling | APScheduler BackgroundScheduler + SQLAlchemyJobStore |
| LLM (optional) | Ollama (local models, e.g. llama3.2) |
| Frontend | React 18, TypeScript 5.7, Vite 6 |
| Styling | Tailwind CSS, shadcn/ui (custom CVA components) |
| Data fetching | React Query v5 |
| Routing | React Router v6 |

## Component Diagram

```
Browser (localhost:5173)
        │
        │  HTTP (proxied /api → :8000)
        ▼
┌───────────────────────────────────┐
│  React Frontend                   │
│  Pages: Dashboard, Companies,     │
│  Cases, Digest, Settings          │
│  Hooks: React Query               │
└───────────────┬───────────────────┘
                │ REST JSON
                ▼
┌───────────────────────────────────┐
│  FastAPI Backend (:8000)          │
│  Routers: companies, cases,       │
│  scraping, digest, settings       │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  Scraping Pipeline          │  │
│  │  Fetcher (static/dynamic/   │  │
│  │    stealthy)                │  │
│  │  Extractors:                │  │
│  │    MetaTags → SchemaOrg →   │  │
│  │    Heuristic → LLM          │  │
│  └─────────────────────────────┘  │
│                                   │
│  APScheduler (weekly job)         │
└───────────────┬───────────────────┘
                │ SQLModel / SQLAlchemy
                ▼
┌───────────────────────────────────┐
│  SQLite  (data/scrappy.db)        │
│  Tables: company, reference_case, │
│  scrape_job, app_settings         │
└───────────────────────────────────┘
                │  (optional)
                ▼
┌───────────────────────────────────┐
│  Ollama  (localhost:11434)        │
│  Local LLM for field extraction   │
└───────────────────────────────────┘
```

## Key Design Principles

1. **Local-first**: No cloud dependencies; SQLite only, no external database required.
2. **Extraction pipeline "earlier wins"**: MetaTag → SchemaOrg → Heuristic → LLM.
   Each extractor fills only empty fields; earlier extractors take priority.
3. **Batch fetching**: Reuses a single Playwright browser for all pages in a job
   (much faster than per-page browser launches).
4. **Raw text storage**: Full page text is stored in `raw_text` for potential
   re-extraction without re-fetching.
5. **Content-change detection**: MD5(`html`) stored as `content_hash`; cases are only
   updated when content actually changes.
6. **Non-blocking scrape**: Scrape jobs run as FastAPI `BackgroundTasks` so HTTP
   response returns immediately with a job ID.
7. **Adaptive polling**: Frontend polls job status at 2s (while running/queued),
   falling back to 10s once idle.
8. **URL-persisted filters**: Cases page serializes all active filters into URL
   search params for shareability/bookmarking.

## Data Flow: Add Company & Scrape

```
1. POST /api/companies  →  Company row created (id = slugified name)
2. POST /api/scrape     →  ScrapeJob created (status=queued) + BackgroundTask started
3. BackgroundTask
   a. GET listing_url       → extract case URLs
   b. fetch_batch(urls)     → HTMLs (reuses browser for dynamic)
   c. For each HTML:
      - Run ExtractionPipeline → data dict
      - Build ReferenceCase model
      - Insert or update (on content_hash change)
   d. Mark ScrapeJob done (cases_found, cases_new)
4. Frontend polls GET /api/scrape/jobs/{id}  (2s interval)
5. Dashboard/Cases auto-refresh when job completes
```

## File Layout

```
scrappy/
├── backend/
│   ├── main.py           # App entry, lifespan, CORS, router registration
│   ├── models.py         # SQLModel table definitions
│   ├── database.py       # Engine, session dependency
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── scheduler.py      # APScheduler setup + weekly job
│   ├── requirements.txt
│   └── routers/          # companies | cases | scraping | digest | settings
│       └── scrapers/
│           ├── fetcher.py
│           ├── listing.py
│           ├── case.py
│           └── extractors/   # base | pipeline | meta_tags | schema_org | heuristic | llm
├── frontend/
│   └── src/
│       ├── App.tsx        # Routes
│       ├── lib/           # api.ts (typed client), utils.ts
│       ├── hooks/         # useCompanies | useCases | useScrape | useSettings
│       ├── pages/         # Dashboard | Companies | Cases | CaseDetail | Digest | Settings
│       └── components/
│           ├── layout/    # Layout, Sidebar
│           ├── companies/ # AddCompanyDialog
│           └── ui/        # badge | button | dialog | input | label | select
├── data/
│   └── scrappy.db
└── specs/                 # ← you are here
```
