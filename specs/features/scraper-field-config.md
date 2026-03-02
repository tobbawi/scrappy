# Feature Spec — Scraper Field Configuration

## User Story

As a user configuring the scraper,
I want to disable specific extracted fields and add extra heuristic keywords,
so that I can control what data is collected and improve extraction accuracy.

## Acceptance Criteria

**Given** I open the Settings page
**When** the page loads
**Then** a "Scraper Fields" section lists all 9 extractable fields with toggle switches (all on by default)

**Given** I disable a field (e.g. `customer_country`) and save
**When** the next scrape runs
**Then** `customer_country` is null on all newly scraped/updated cases

**Given** I add extra keywords (e.g. "pain point, problem") to the `challenge` field and save
**When** the heuristic extractor processes a page with a heading "Pain Point"
**Then** the challenge field is populated from the content following that heading

**Given** I call `GET /api/settings`
**When** settings have been saved
**Then** `scraper_enabled_fields` returns the list of disabled field names and `scraper_heuristic_labels` returns the keyword map

## Extractable Fields

`customer_name`, `customer_industry`, `customer_country`, `challenge`, `solution`, `results`, `products_used`, `quote`, `tags`

Heuristic keyword customisation is available for: `challenge`, `solution`, `results`, `tags`

## Files Changed

### Backend
- `backend/models.py` — two new columns on `AppSettings`
- `backend/main.py` — migration for new columns
- `backend/schemas.py` — `SettingsRead` / `SettingsUpdate` extended
- `backend/routers/settings.py` — JSON serialization/deserialization of new fields
- `backend/scrapers/extractors/heuristic.py` — `HeuristicExtractor(custom_labels=…, company_name=…)` constructor
- `backend/scrapers/extractors/pipeline.py` — `ExtractionPipeline(scraper_config=…, company_name=…)` + field nulling
- `backend/routers/scraping.py` — passes `scraper_config` and `company_name` to `ExtractionPipeline`
- `backend/scrapers/case.py` — `scrape_case()` forwards `llm_config`, `scraper_config`, `company_name` to pipeline

### Frontend
- `frontend/src/lib/api.ts` — extended `AppSettings` interface
- `frontend/src/pages/Settings.tsx` — Scraper Fields card with toggles + keyword inputs

## API Reference

See [../api/settings.md](../api/settings.md) for updated `GET`/`PATCH /api/settings`.
