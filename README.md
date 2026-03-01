# Scrappy — Reference Case Tracker

[![GitHub](https://img.shields.io/badge/GitHub-tobbawi%2Fscrappy-blue?logo=github)](https://github.com/tobbawi/scrappy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A local web application to track reference cases (customer success stories) published by company websites.

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium   # for dynamic/stealthy fetching
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # Vite dev server on :5173, proxies /api → :8000
```

Open http://localhost:5173

## Project Structure

```
scrappy/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # SQLModel table definitions
│   ├── database.py          # SQLite setup
│   ├── schemas.py           # Pydantic schemas
│   ├── scheduler.py         # APScheduler (weekly scrape)
│   ├── routers/
│   │   ├── companies.py     # CRUD companies
│   │   ├── cases.py         # Read/filter cases
│   │   ├── scraping.py      # Trigger + job status
│   │   └── digest.py        # Weekly digest + stats
│   └── scrapers/
│       ├── fetcher.py       # static / dynamic / stealthy
│       ├── listing.py       # Extract case URLs from listing page
│       ├── case.py          # Fetch + extract individual case
│       └── extractors/
│           ├── base.py
│           ├── meta_tags.py   # OG tags, article:published_time
│           ├── schema_org.py  # JSON-LD Schema.org
│           ├── heuristic.py   # h1/blockquote/semantic classes
│           └── pipeline.py    # Runs extractors in order
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Companies, Cases, CaseDetail, Digest, Settings
│       ├── components/      # Layout, company/case components, shadcn/ui
│       ├── hooks/           # useCompanies, useCases, useScrape
│       └── lib/             # api.ts (typed client), utils.ts
└── data/
    └── scrappy.db           # SQLite database (auto-created)
```

## Adding a Company

1. Go to **Companies** → **Add Company**
2. Enter company name and listing URL (e.g. `https://acme.com/customers`)
3. Choose fetcher type:
   - **Static** — fast, works for plain HTML pages
   - **Dynamic** — uses Playwright headless browser for JS-rendered pages
   - **Stealthy** — Playwright with extra browser headers
4. Optionally set a **case path prefix** (e.g. `/customers/`) to filter which links are treated as cases
5. Click **Scrape Now** to run the first scrape

## API Endpoints

```
GET  /api/companies
POST /api/companies
PATCH /api/companies/{id}
DELETE /api/companies/{id}

GET  /api/cases?company=&q=&industry=&country=&new_only=&sort=&page=&per_page=
GET  /api/cases/{id}

POST /api/scrape          { "company_id": "acme" | "all" }
GET  /api/scrape/jobs
GET  /api/scrape/jobs/{id}

GET  /api/digest?since=YYYY-MM-DD&format=json|html|markdown
GET  /api/stats
```

## Scheduler

The backend automatically runs a full scrape every **Friday at 18:00 UTC** using APScheduler.

## Architecture Notes

- No LLM used — extraction is heuristic (OG tags → JSON-LD Schema.org → HTML patterns)
- `raw_text` field stored on each case for future LLM extraction
- Extractor pipeline is pluggable: add `LLMExtractor` to `pipeline.py` when ready
- SQLite stored in `data/scrappy.db` — no external database required
