# Scrappy — CLAUDE.md

Local web app that tracks reference cases from 60+ company websites.

## Quick Start

```bash
# Backend (Python 3.14, activate venv first)
cd backend && .venv/bin/uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev   # proxies /api → :8000
```

DB is auto-created at `data/scrappy.db` on first run.

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLModel + SQLite |
| Scraping | httpx (static), Playwright 1.58 (dynamic/stealthy) |
| Scheduling | APScheduler + SQLAlchemyJobStore |
| LLM (optional) | Ollama |
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| Data fetching | React Query v5 |

## Key Paths

```
backend/
  main.py              # app entry, lifespan, CORS, routes
  models.py            # SQLModel tables: Company, ReferenceCase, ScrapeJob, AppSettings
  schemas.py           # Pydantic request/response schemas
  scheduler.py         # APScheduler weekly job (Friday 18:00 UTC)
  routers/             # companies | cases | scraping | digest | settings
  scrapers/
    fetcher.py         # static / dynamic / stealthy fetch strategies
    listing.py         # discover case URLs from a listing page
    case.py            # build ReferenceCase from extracted data
    extractors/        # base | pipeline | meta_tags | schema_org | heuristic | llm
frontend/src/
  App.tsx              # routes
  lib/api.ts           # typed API client
  hooks/               # useCompanies | useCases | useScrape | useSettings
  pages/               # Dashboard | Companies | Cases | CaseDetail | Digest | Settings
  components/ui/       # Badge (custom CVA) | Button | Dialog | Input | Label | Select
```

## Architecture

- Extraction pipeline order: MetaTags → SchemaOrg → Heuristic → LLM (earlier wins, no overwrite)
- Case ID = `sha256(url)[:12]`; Company ID = `slugify(name)`
- Scrape jobs run as FastAPI `BackgroundTasks`; frontend polls at 2s (running) / 10s (idle)
- `raw_text` stores up to 50 KB of page text for LLM re-extraction
- `content_hash = MD5(html)` prevents unnecessary DB updates

## Python 3.14 Gotchas

- `greenlet 3.1.1` does NOT build on 3.14 → use `playwright==1.58.0` (pulls greenlet 3.3.2+)
- `SQLModel>=0.0.37`, `SQLAlchemy==2.0.47`
- No `aiosqlite` (sync SQLModel only)

## Frontend Notes

- `@radix-ui/react-badge` does not exist — Badge is a custom CVA component
- URL-persisted filters on Cases page via `useSearchParams`

---

## Spec-Driven Development

All features are documented in `specs/`. **Keep specs up-to-date** whenever code changes.

### Spec locations

| What changed | Update this spec |
|---|---|
| New or changed API endpoint | `specs/api/<router>.md` |
| New or changed DB model/field | `specs/data-models/<model>.md` |
| New or changed feature / user story | `specs/features/<feature>.md` |
| Architecture decision | Append ADR to `specs/architecture/decisions.md` |
| New feature file added | Create `specs/features/<feature-name>.md` |
| Feature removed | Delete spec or mark it `[DEPRECATED]`; remove cross-references |

### Spec format rules

- **Feature specs**: User story (As a / I want / so that) + acceptance criteria (Given/When/Then)
- **API specs**: Method + path, request fields table, response shape, error codes
- **Data model specs**: Field table with type / nullable / default / description
- **ADRs**: Context → Decision → Consequences

### When to write specs

1. **Before writing code for a new feature**: draft the feature spec first.
2. **While implementing**: update API and model specs as the contract solidifies.
3. **After completing a feature**: verify all specs match the final implementation.

See `specs/README.md` for the full structure and conventions.
