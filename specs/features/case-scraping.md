# Feature Spec — Case Scraping

## Overview

The scraping pipeline discovers case study URLs from a company's listing page,
fetches each page, extracts structured data, and stores the results.

---

## User Stories

### US-1: Discover new cases

**As a user**, when I trigger a scrape,
**I expect** new case studies to appear in the database.

**Acceptance criteria:**
- Given a company with a valid `listing_url`
- When a scrape job runs
- Then the listing page is fetched using the company's `fetcher_type`
- And all links matching `case_path_prefix` (or heuristic keywords) are collected
- And each new URL is fetched and extracted
- And new `ReferenceCase` rows are inserted
- And `ScrapeJob.cases_new` reflects the count

---

### US-2: Detect changed cases

**As a user**, I expect that if a case study page changes content,
the stored data is updated.

**Acceptance criteria:**
- Given a case already exists in the DB
- When the scraper re-fetches the page and the HTML is different
- Then `content_hash` is updated
- And the extracted fields are re-populated (pipeline runs again)
- And `last_checked` is updated

---

### US-3: Skip unchanged cases

**As a user**, I expect scraping to be efficient and not reprocess pages that haven't changed.

**Acceptance criteria:**
- Given a case exists and its HTML `content_hash` is unchanged
- When the scraper encounters it
- Then no DB write occurs for that case
- And `ScrapeJob.cases_found` is incremented but `cases_new` is not

---

## Extraction Pipeline

Extractors run in order. Each extractor only fills fields that are still `None` ("earlier wins"):

| Order | Extractor | Strategy |
|-------|-----------|---------|
| 1 | MetaTagExtractor | OG tags, Twitter card tags, `<meta name="date">` |
| 2 | SchemaOrgExtractor | `<script type="application/ld+json">` (Article, BlogPosting) |
| 3 | HeuristicExtractor | h1/h2/h3, section label patterns, blockquote, CSS classes, `<em>` quotes, description patterns |
| 4 | LLMExtractor | Ollama LLM on first 8 000 chars of `raw_text` (auto-detected or configured) |

### HeuristicExtractor section detection

The heuristic extractor looks for **section label elements** — any `<h2>`–`<h4>` or `<p>`/`<span>`/`<div>`
whose entire text matches a known label (e.g. "The challenge", "Solution", "Results") — and
collects the sibling content that follows (up to 1 500 chars). This handles sites like
Webflow-built pages where semantic headings are styled `<p>` elements.

Recognised label groups (English + Dutch + French):
- **challenge**: "the challenge", "challenge", "the problem", … / "de uitdaging", "uitdaging", "het probleem", "aanleiding", … / "le défi", "défi", "le problème", …
- **solution**: "the solution", "solution", "our approach", … / "de oplossing", "oplossing", "onze aanpak", … / "la solution", "notre solution", …
- **results**: "results", "outcomes", "impact", … / "resultaten", "de resultaten", "de cijfers", … / "résultats", "les résultats"

Customer name is also extracted from `og:description` / `og:title` patterns such as
"for [Company]", "[Company]:", "helping [Company]".

#### Quote and quote_author detection

Four strategies are tried in order:
1. **Testimonial headings** — if a heading matches a known testimonial label (e.g. "getuigenis", "témoignage", "what our clients say") the first substantial sibling paragraph is the quote.
2. **`<blockquote>` tags** — text in the blockquote; `<cite>` child or next sibling checked for author.
3. **Semantic CSS classes** — elements with class matching `quote|testimonial|blockquote|pull-quote|callout-quote`.
4. **Quotation-mark-wrapped text** — `<em>`/`<strong>`/`<p>` whose entire text is wrapped in curly or straight quote characters.

After each strategy finds a quote, the next sibling element is inspected as a potential `quote_author`
using `_looks_like_author()` (starts with uppercase, 2–120 chars, looks like a name/title string).

#### Tag noise filter

Tags extracted via CSS classes (`tag|label|badge|category|pill|topic|keyword`) are filtered
through a `_TAG_NOISE` blocklist of common CTA/nav strings (e.g. "Contact", "Read more",
"Let's talk!", "Contacteer ons") and capped at 6 words. Only tags that survive both filters
are stored.

#### Date normalisation

Dutch and French month names (`januari`, `février`, `mars`, …) are normalised to English before
passing to `dateutil.parse`, so dates on Belgian/French pages are correctly parsed. The date
regex also matches `"15 januari 2024"` and `"mars 2023"` patterns in addition to English formats.

### Ollama auto-detection

`detect_ollama()` in `pipeline.py` probes `http://localhost:11434/api/tags` at scrape time.
If Ollama is running with at least one model loaded, it is used automatically — no manual
settings configuration required. Preferred models in order: llama3.2, llama3, mistral, phi3, phi, gemma.

If `ollama_enabled=True` in AppSettings, the explicitly configured model/URL/timeout are used instead.

### Extracted fields

`title`, `customer_name`, `customer_industry`, `customer_country`, `customer_logo_url`,
`challenge`, `solution`, `results`, `products_used`, `quote`, `quote_author`,
`quote_author_company`, `publish_date`, `tags`, `raw_text`

---

## Fetcher Types

| Type | Implementation | When to use |
|------|---------------|-------------|
| `static` | httpx GET | Plain HTML sites |
| `dynamic` | Playwright (networkidle + 6s) | JavaScript-rendered sites |
| `stealthy` | Playwright + browser-like headers | Bot-detection sites |

Batch fetching reuses a single Playwright browser for all pages in one job.

---

## URL Discovery (listing.py)

1. Fetch `listing_url`
2. Parse all `<a href>` tags
3. Keep links that are:
   - Same domain as `listing_url`, or relative
   - Match `case_path_prefix` (if set), **or** contain a signal keyword:
     `case`, `customer`, `success`, `story`, `reference`, `client`
4. Deduplicate and return sorted list

---

## API Endpoints

- `POST /api/scrape`
- `GET /api/scrape/jobs`
- `GET /api/scrape/jobs/{id}`

See [api/scraping.md](../api/scraping.md).
