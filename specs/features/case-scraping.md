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
| 4 | LLMExtractor | LLM on first 8 000 chars of `raw_text` (Ollama or OpenAI-compatible, auto-detected or configured) |

### Cookie consent banner stripping

Before extractors run, `ExtractionPipeline._strip_cookie_banners(soup)` removes common cookie
consent overlays from the parsed HTML. This prevents boilerplate text from polluting `raw_text`
(which feeds LLM extraction) and from causing false industry matches in the heuristic extractor.

Stripped elements:
- **By ID**: `CybotCookiebotDialog`, `CybotCookiebotDialogBodyUnderlay`, `onetrust-consent-sdk`, `cookie-law-info-bar`
- **By class pattern**: any element whose class matches `cookie[-_]?(consent|banner|notice|popup|dialog|overlay)` (case-insensitive)

### HeuristicExtractor section detection

The heuristic extractor looks for **section label elements** — any `<h2>`–`<h4>` or `<p>`/`<span>`/`<div>`
whose entire text matches a known label (e.g. "The challenge", "Solution", "Results") — and
collects the sibling content that follows (up to 1 500 chars). This handles sites like
Webflow-built pages where semantic headings are styled `<p>` elements.

Recognised label groups (English + Dutch + French):
- **challenge**: "the challenge", "challenge", "the problem", … / "de uitdaging", "uitdaging", "het probleem", "aanleiding", … / "le défi", "défi", "le problème", …
- **solution**: "the solution", "solution", "our approach", … / "de oplossing", "oplossing", "onze aanpak", … / "la solution", "notre solution", …
- **results**: "results", "outcomes", "impact", … / "resultaten", "de resultaten", "de cijfers", … / "résultats", "les résultats"

#### Vendor-prefixed section labels

When `company_name` is provided, the extractor auto-generates `"{company_name} {label}"` variants
for all single-word core labels. For example, if the vendor is "Formica", headings like
"Formica solution", "Formica challenge", "Formica oplossing" are automatically recognised.
This handles sites where case study sections are titled with the vendor name instead of generic labels.

#### Customer name from title patterns

Customer name is extracted from `og:description` / `og:title` patterns such as
"for [Company]", "[Company]:", "helping [Company]".

Additionally, if `company_name` is set, the extractor checks the title for separator patterns
like "CustomerName - VendorName" (supporting ` - `, ` | `, ` — `, ` – ` separators). The first
part that doesn't match the vendor name is used as the customer name.

#### Quote and quote_author detection

Four strategies are tried in order:
1. **Testimonial headings** — if a heading matches a known testimonial label (e.g. "getuigenis", "témoignage", "what our clients say") the first substantial sibling paragraph is the quote.
2. **`<blockquote>` tags** — text in the blockquote; `<cite>` child or next sibling checked for author.
3. **Semantic CSS classes** — elements with class matching `quote|testimonial|blockquote|pull-quote|callout-quote`.
4. **Quotation-mark-wrapped text** — `<em>`/`<strong>`/`<p>` whose entire text is wrapped in curly or straight quote characters.

After each strategy finds a quote, the next sibling element is inspected as a potential `quote_author`
using `_looks_like_author()` which returns a cleaned author string or `None`. It strips leading
dash/bullet prefixes (`- `, `– `, `— `, `• `) and validates the result (starts with uppercase,
2–120 chars, looks like a name/title string).

#### Vendor-name guard

`HeuristicExtractor` accepts an optional `company_name` parameter (threaded from
`ExtractionPipeline` ← `run_scrape_job`). After customer name extraction, if the result
matches the company name (case-insensitive), it is cleared to `None` so downstream
extractors (e.g. LLM) can fill the correct customer name instead.

#### Section content validation

Extracted section content (challenge, solution, results) is validated before storing:
- **Minimum length**: content under 20 characters is rejected (catches garbage like "Over ons")
- **Boilerplate detection**: content containing known footer CTA phrases (e.g. "technology agnostic company", "map your processes") is rejected via `_BOILERPLATE_SIGNALS`

#### Tag noise filter

Tags extracted via CSS classes (`tag|label|badge|category|pill|topic|keyword`) are filtered
through a `_TAG_NOISE` blocklist of common CTA/nav/UI strings (e.g. "Contact", "Read more",
"Let's talk!", "Contacteer ons", video player controls like "play"/"pause"/"mute",
filter UI like "filter on sector", nav items like "over ons"/"jobs") and capped at 6 words.
Only tags that survive both filters are stored.

#### Date normalisation

Dutch and French month names (`januari`, `février`, `mars`, …) are normalised to English before
passing to `dateutil.parse`, so dates on Belgian/French pages are correctly parsed. The date
regex also matches `"15 januari 2024"` and `"mars 2023"` patterns in addition to English formats.

### LLM provider resolution

At scrape time, `llm_provider` in AppSettings determines which LLM backend is used:
- `"ollama"` — uses configured `ollama_base_url` / `ollama_model` / `ollama_timeout`
- `"openai"` — uses configured `openai_base_url` / `openai_model` / `openai_timeout` (OpenAI-compatible API)
- `"none"` — falls back to auto-detecting a local Ollama via `detect_ollama()`

`detect_ollama()` probes `http://localhost:11434/api/tags`. If Ollama is running with at least
one model loaded, it is used automatically. Preferred models: llama3.2, llama3, mistral, phi3, phi, gemma.

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
4. Deduplicate
5. Post-discovery filter (`_filter_discovered_urls`):
   - **Pagination**: drop URLs whose path ends with `/p\d+` (e.g. `/cases/p2`)
   - **Same-depth / shallower**: drop URLs with ≤ listing page path depth (catches subcategory pages and alt-language listing pages)
   - **`-old` / `-new` duplicates**: if both `/foo-old` and `/foo` exist, drop the `-old` variant (same for `-new`)
6. Return filtered list

---

## API Endpoints

- `POST /api/scrape`
- `GET /api/scrape/jobs`
- `GET /api/scrape/jobs/{id}`

See [api/scraping.md](../api/scraping.md).
