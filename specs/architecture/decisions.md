# Architecture Decision Records

Each ADR follows the format: **Context → Decision → Consequences**

---

## ADR-001 — SQLite over PostgreSQL

**Date:** 2024 (initial design)

**Context:** Scrappy is a local utility app for a single user. Ease of setup matters
more than concurrent writes or horizontal scaling.

**Decision:** Use SQLite via SQLModel/SQLAlchemy. DB file lives at `data/scrappy.db`.

**Consequences:**
- No external database process needed; zero-config setup.
- Not suitable for multi-user or high-write scenarios.
- Must use sync SQLModel (no async engine with SQLite in this setup).

---

## ADR-002 — Extraction Pipeline "Earlier Wins"

**Date:** 2024 (initial design)

**Context:** Multiple extractor strategies exist (OG tags, JSON-LD, heuristics, LLM).
They disagree on the same fields. Need a deterministic merge strategy.

**Decision:** Run extractors in fixed order: MetaTags → SchemaOrg → Heuristic → LLM.
Each extractor only fills fields that are still `None`; it never overwrites an already-filled field.

**Consequences:**
- Structured signals (OG, JSON-LD) always take precedence over fuzzy heuristics.
- LLM is a last-resort fill-in, not a first-class source.
- Easy to add a new extractor at any position in the chain.
- If an upstream extractor sets a wrong value, downstream cannot correct it.

---

## ADR-003 — Raw Text Storage

**Date:** 2024 (initial design)

**Context:** Re-fetching pages is slow and bandwidth-intensive. LLM extraction may be
added later or improved over time.

**Decision:** Store the full page text (up to 50 KB) in `ReferenceCase.raw_text`.

**Consequences:**
- Future LLM re-runs or model upgrades can operate on stored text without re-scraping.
- Database size grows; capped at 50 KB per case to bound growth.

---

## ADR-004 — Batch Browser Reuse for Dynamic Fetching

**Date:** 2024 (initial design)

**Context:** Playwright launches a browser process per run. Per-page launches were
extremely slow for companies with 50+ case pages.

**Decision:** `fetch_batch()` launches one Playwright browser per scrape job and
reuses it for all pages. Falls back to httpx (static) on failure.

**Consequences:**
- 10–20× faster for dynamic companies compared to per-page launches.
- Memory footprint of one Chromium process during a job.

---

## ADR-005 — Company ID = Slugified Name

**Date:** 2024 (initial design)

**Context:** Need a stable, URL-safe primary key for companies.

**Decision:** `id = slugify(name)` (e.g., "Acme Corp" → "acme-corp").

**Consequences:**
- Human-readable IDs in URLs and logs.
- Renaming a company requires migrating all related case foreign keys.
- Duplicate company detection: same slug = same company.

---

## ADR-006 — Case ID = SHA256(url)[:12]

**Date:** 2024 (initial design)

**Context:** Need a stable, collision-resistant primary key derived from the canonical URL.

**Decision:** `id = sha256(url).hexdigest()[:12]`

**Consequences:**
- Idempotent: re-scraping the same URL always resolves to the same case ID.
- 12 hex chars = 48 bits; collision probability negligible for < 1 M cases.

---

## ADR-007 — Non-Blocking Scrape via BackgroundTasks

**Date:** 2024 (initial design)

**Context:** Scraping can take minutes for large sites. Blocking the HTTP response
would cause timeouts and poor UX.

**Decision:** Use FastAPI `BackgroundTasks` to run scrape jobs. The `/api/scrape`
endpoint returns immediately with a `ScrapeJob` (status=queued); clients poll for status.

**Consequences:**
- Good responsiveness; no HTTP timeouts.
- Job status must be polled (2s interval while running).
- In-process background tasks: if the server crashes mid-job, the job is lost.

---

## ADR-008 — Optional Ollama LLM Integration

**Date:** 2024 (added post-initial)

**Context:** LLM extraction can fill fields that structured/heuristic extractors miss,
but Ollama may not be installed on every machine.

**Decision:** Ollama integration is opt-in, controlled by `AppSettings.llm_provider`
(`"none"` | `"ollama"` | `"openai"`; see ADR-017).
Settings (URL, model, timeout) are stored in a singleton DB row and configurable via UI.

**Consequences:**
- Zero impact on users who don't have Ollama.
- LLM extraction quality depends on the chosen model.
- Adds latency per case when enabled.

---

## ADR-009 — Custom Badge Component (no @radix-ui/react-badge)

**Date:** 2024

**Context:** The `@radix-ui/react-badge` npm package does not exist. Needed a Badge UI primitive.

**Decision:** Implement `Badge` as a custom CVA-based component in `components/ui/badge.tsx`.
Variants: default, success, warning, error, secondary, outline, new.

**Consequences:**
- Full control over variants.
- Must maintain the component manually (no upstream updates).

---

## ADR-010 — SaaS-Style Design System (Indigo + Dark Sidebar)



**Date:** 2026-03

**Context:** Primary users are Sales/BD reps, Marketing, and Management who browse new cases
daily. The original UI was functional but generic (flat, low hierarchy, muted palette).
A more polished design reduces friction and surfaces the "what's new" signal faster.

**Decision:** Adopt a Linear/Vercel-inspired design system:
- **Primary colour**: Indigo-violet (`243 75% 59%`) replaces plain blue (`221 83% 53%`)
- **Sidebar**: Near-black (`240 10% 8%`) with `zinc-400` inactive / `white` active nav states
- **Background**: Subtly warm off-white (`0 0% 98.5%`) instead of pure white
- **Cards**: Pure white with `shadow-card` (`0 1px 3px / .06`) instead of flat borders
- **Borders**: Lightened to `0 0% 92%` (barely visible, like Linear)
- **Design tokens**: Added `--sidebar` and `--sidebar-fg` CSS variables; `shadow-card` Tailwind token
- **Typography**: Added `cv11`, `ss01` font features; `tracking-tight` on all headings
- **Utilities**: `timeAgo()` for relative timestamps; `isNewThisWeek()` for NEW badge logic

**Consequences:**
- Consistent, premium aesthetic without adding new dependencies.
- Dark sidebar requires careful colour contrast checks for nav items.
- `--sidebar` CSS variable must be used (not Tailwind `bg-muted`) for correct dark background.
- `timeAgo()` result updates only on page refresh (no live clock); acceptable for this use case.

---

## ADR-011 — SSRF Prevention on User-Supplied URLs

**Date:** 2026-03

**Context:** Two endpoints accept user-controlled URLs that are subsequently used in
server-side HTTP requests: `listing_url` (stored on Company, used when scraping) and
`ollama_base_url` (stored in AppSettings, used to probe Ollama). Without validation,
an attacker could supply internal addresses (`127.0.0.1`, `169.254.169.254`, RFC-1918
ranges) to make the server fetch internal services.

**Decision:**
- `listing_url` is validated in `scrapers/listing.py::is_safe_url()` at fetch time.
- `ollama_base_url` is validated in the `SettingsUpdate` Pydantic schema via
  `@field_validator("ollama_base_url")` at request time.
- Both checks: scheme must be `http` or `https`; hostname must not resolve to a
  loopback, private, link-local, or reserved IP range (via `ipaddress.ip_address()`);
  `localhost` and `*.local` domain names are also rejected.

**Consequences:**
- Requests to private network addresses are blocked before any HTTP call is made.
- Legitimate Ollama installs on `localhost` cannot be configured via the API; users
  must use a routable hostname or keep the default `http://localhost:11434` already
  stored in the DB. The SSRF check runs only on updates, not on reads.
- `listing_url` values already in the DB are not retroactively validated; the check
  fires when `get_case_urls()` is called during a scrape.

---

## ADR-012 — URL Normalisation Strips Query Strings

**Date:** 2026-03

**Context:** Listing pages sometimes link to the same case study with different query
parameters (UTM tracking, session tokens, etc.). Because `ReferenceCase.url` has a
`UNIQUE` constraint, inserting the same path with different query strings creates
duplicate rows or triggers integrity errors.

**Decision:** `normalize_url()` in `scrapers/listing.py` strips both the URL fragment
and the query string when resolving hrefs to absolute URLs. The canonical form used
for deduplication and storage is `scheme://host/path` with no query or fragment.

**Consequences:**
- Two links to the same page with different UTM parameters are treated as one case.
- Query-string-based pagination (e.g. `?page=2`) is also stripped; this is acceptable
  because listing pages are fetched directly, not via discovered hrefs.
- Case URLs stored in the DB are clean canonical paths.

---

## ADR-013 — Paginated Companies Endpoint

**Date:** 2026-03

**Context:** `GET /api/companies` previously returned all companies in a single
response with no limit. While the typical dataset is ~60 companies, an unbounded query
is a latency and memory risk as the dataset grows.

**Decision:** `GET /api/companies` now returns a `PaginatedCompanies` envelope
(`items`, `total`, `page`, `per_page`, `pages`) with a default `per_page=100` and
maximum `per_page=200`. This mirrors the existing `PaginatedCases` pattern.

**Consequences:**
- All callers must read `.items` instead of the raw array.
- Frontend (`useCompanies`, `Companies.tsx`, `Cases.tsx`) updated accordingly.
- Default page size (100) comfortably covers the expected company count without
  requiring clients to implement pagination for the common case.

---

## ADR-015 — Multilingual (Dutch/French) Heuristic Extraction

**Date:** 2026-03-02

**Context:** Analysis of 132 cases across 10 Belgian companies showed near-zero fill rates
for `publish_date` (4%), `quote_author` (1%), and significant garbage in `tags` (100% noise).
The root cause: all section labels, date patterns, and testimonial keywords were English-only,
while the target corpus is predominantly Dutch and French.

**Decision:**
- `SECTION_LABELS` extended with Dutch + French equivalents for challenge / solution / results.
- `_DUTCH_MONTHS` map normalises Dutch/French month names to English before `dateutil.parse`;
  the date regex is extended to match `"15 januari 2024"` / `"mars 2023"` patterns.
- `_TAG_NOISE` frozenset filters CTA/nav labels (Dutch + English); tags also capped at 6 words.
- `_TESTIMONIAL_LABELS` frozenset detects testimonial headings in Dutch/French/English,
  enabling quote extraction from structured testimonial sections.
- `_looks_like_author()` helper checks the next DOM sibling after any found quote for a person
  attribution line; applied across all four quote-find strategies.
- Section content limit raised from 800 → 1 500 chars to capture longer Dutch/French paragraphs.
- `LLMExtractor` gains `quote` and `quote_author` as output fields with explicit prompt rules.

**Consequences:**
- Expected `publish_date` fill rate: 4% → significantly higher on Dutch/French pages.
- Expected `quote_author` fill rate: 1% → 30%+ where quotes exist.
- Tags no longer contain nav/CTA noise; may reduce tag count on some pages.
- No schema or API changes required; purely extractor-internal.

---

## ADR-014 — Scraper Field Config Stored as JSON Strings in AppSettings

**Date:** 2026-03-01

**Context:** Users need the ability to disable specific extracted fields and add extra
heuristic section-header keywords without requiring a DB schema change per field.

**Decision:** Store `scraper_enabled_fields` (list of disabled field names) and
`scraper_heuristic_labels` (field → keyword list map) as TEXT columns containing
JSON. Serialization/deserialization happens in the settings router; the API surfaces
them as proper JSON types (`list[str]` and `dict`). The `HeuristicExtractor` accepts
`custom_labels` at construction time and merges them into its section-label tables
without mutating module-level constants.

**Consequences:**
- No new DB tables required; two TEXT columns on the existing singleton row.
- Column migration (ALTER TABLE) runs safely at startup alongside existing migrations.
- `SettingsRead` cannot use `from_attributes = True` for these fields; the router
  constructs the response explicitly via `_settings_to_read()`.
- Pipeline accepts a `scraper_config` dict; disabled fields are nulled out *after*
  all extractors run, giving extractors no special-casing.

---

## ADR-016 — Scraping Quality Overhaul (Round 2)

**Date:** 2026-03-02

**Context:** Deep analysis of the 132-case DB after round 1 revealed five systemic problems:
listing page pollution (10%), vendor-as-customer (20%), residual tag noise (~30 new junk strings),
boilerplate sections captured as content, and unstripped quote author prefixes.

**Decision:**
- `listing.py` gains `_filter_discovered_urls()` which removes pagination URLs (`/p\d+`),
  same-depth / shallower URLs (subcategory / alt-language listings), and `-old`/`-new`
  duplicate variants after URL discovery.
- `HeuristicExtractor` takes `company_name` (threaded via `ExtractionPipeline` ← router) and
  clears `customer_name` when it matches the vendor, preventing vendor-as-customer extraction.
- `_TAG_NOISE` expanded with ~30 strings: video player controls, navigation items, filter UI
  labels, and CTA text found in the DB.
- `_BOILERPLATE_SIGNALS` list + `_valid_section_content()` rejects known footer CTA phrases
  and sections shorter than 20 characters from challenge/solution/results.
- `_looks_like_author()` refactored from `bool` → `str | None`; strips leading `- `/`– `/`— `/`• `
  prefixes before returning the cleaned author name.
- `scrape_case()` in `case.py` simplified to reuse `build_case_from_data()` and accepts
  `llm_config`, `scraper_config`, `company_name` kwargs.

**Consequences:**
- Listing pollution eliminated: junk URLs no longer enter the scrape pipeline.
- ~27 vendor-as-customer cases will have `customer_name = NULL` on next re-scrape, allowing
  LLM to fill the correct value.
- Tag quality further improved; video/nav/filter noise removed.
- Boilerplate footer text no longer stored as challenge/solution/results.
- Quote authors no longer carry leading dash prefixes.
- No schema or API changes required; purely scraper-internal.

---

## ADR-017 — Generic OpenAI-Compatible LLM Provider

**Date:** 2026-03

**Context:** LLM extraction only supported Ollama. Users running llama.cpp, vLLM, LocalAI,
or LM Studio had no way to use their inference server. All of these expose an
OpenAI-compatible API (`/v1/chat/completions`, `/v1/models`).

**Decision:** Replace the `ollama_enabled` boolean with a `llm_provider` selector
(`"none"` | `"ollama"` | `"openai"`). Add parallel `openai_base_url`, `openai_model`,
`openai_timeout` settings fields. `LLMExtractor` gains a `provider` parameter and
dispatches to either the Ollama or OpenAI-compatible chat completions API. Existing
`ollama_enabled=true` rows are auto-migrated to `llm_provider="ollama"` on startup.
Generic `/api/settings/llm/models` and `/api/settings/llm/test` endpoints accept a
`provider` query parameter; legacy `/ollama/*` endpoints are kept as aliases.

**Consequences:**
- Any server implementing `/v1/chat/completions` and `/v1/models` now works out of the box.
- `ollama_enabled` column retained in the DB for migration but no longer read by app logic.
- Frontend shows a provider selector (None / Ollama / OpenAI-compatible) with
  provider-specific config fields.
- `provider="none"` still falls back to auto-detecting a local Ollama instance.

---

## ADR-018 — Cookie Banner Stripping and Vendor-Prefixed Section Labels

**Date:** 2026-03

**Context:** Sites using Cookiebot (and similar consent managers) render 9 KB+ of cookie
policy text inside the page HTML. This boilerplate pollutes `raw_text` (hurting LLM extraction
quality), causes false positive industry matches (e.g. "technology" from "search technology
partner" in cookie text), and wastes LLM token budget. Separately, some vendors title their
case study sections as "{VendorName} solution" or "{VendorName} challenge" instead of generic
labels, which the heuristic extractor didn't recognise.

**Decision:**
1. `ExtractionPipeline._strip_cookie_banners(soup)` runs before text extraction, removing
   elements by known IDs (`CybotCookiebotDialog`, `onetrust-consent-sdk`, etc.) and by class
   pattern matching `cookie[-_]?(consent|banner|notice|popup|dialog|overlay)`.
2. `HeuristicExtractor.__init__` auto-generates `"{company_name} {label}"` variants for all
   single-word section labels when `company_name` is provided (e.g. "formica solution").
3. `HeuristicExtractor._extract_customer_name` checks for "CustomerName - VendorName" title
   patterns (supporting ` - `, ` | `, ` — `, ` – ` separators).

**Consequences:**
- `raw_text` is significantly cleaner on Cookiebot sites, improving both heuristic and LLM quality.
- Industry false positives from cookie/footer text are eliminated.
- Vendor-specific section headings are matched without per-company heuristic label configuration.
- Title-based customer name extraction works for sites that use "Customer - Vendor" title patterns.
- No schema or API changes required; purely scraper-internal.

---

## ADR-019 — Docker Compose Deployment

**Date:** 2026-03

**Context:** Scrappy requires two manually started processes (backend uvicorn + frontend vite dev).
For repeatable deployment and easier onboarding, a single-command setup is preferred.

**Decision:** Add `docker-compose.yml` with two services:
- **backend**: `python:3.13-slim` + Playwright Chromium, WORKDIR `/app/backend` (so
  `Path(__file__).parent.parent / "data"` resolves to `/app/data`), bind mount `./data:/app/data`.
- **frontend**: Multi-stage build (Node 22 → nginx:alpine), serves static files on port 3000,
  proxies `/api` to `backend:8000` via `nginx.conf`.

Ollama is **not containerized** on macOS because Docker Desktop runs a Linux VM with no Metal
GPU access. Instead, `OLLAMA_HOST` env var points to `host.docker.internal:11434` (host Ollama).
`extra_hosts: host.docker.internal:host-gateway` ensures DNS resolution works.

CORS origins are configurable via `CORS_ORIGINS` env var (default includes `:3000` and `:5173`).
`OLLAMA_HOST` seeds the initial `ollama_base_url` in settings on first DB creation only;
the field remains fully editable via the Settings UI afterward.

Memory limits: backend 2 GB, frontend 128 MB (nginx).

**Consequences:**
- `docker compose up --build` starts the full app.
- Data persists in `./data/scrappy.db` across restarts.
- Local dev (`uvicorn` + `npm run dev`) continues to work unchanged.
- GPU passthrough config is commented out; uncomment for Linux hosts with NVIDIA GPUs.
- Users must run Ollama natively on macOS for Metal acceleration.

---

## ADR-020 — Customer Name Extraction Pattern Ordering

**Date:** 2026-03

**Context:** Title-based customer name extraction used a single "for [Company]" regex first,
which caused false matches (e.g. "for B2B Events" instead of "Spire" from "Giving Spire's
Mascot a Home for B2B Events"). The "helping" pattern also missed Title Case names due to
case-sensitivity, and the "for" pattern over-captured lowercase words after the company name
(e.g. "Cronos Europa on a tight deadline" instead of "Cronos Europa").

**Decision:** Reorder and refine `_customer_from_text()` patterns (most specific first):
1. Possessive (`[Company]'s`) — new pattern
2. Helping (`Helping [Company] [verb]`) — case-insensitive, stops at common verb suffixes
3. Colon (`[Company]:`) — now accepts leading digits (e.g. "10maal10")
4. How/Why (`How [Company] verb`)
5. For (`for [Company]`) — now captures only consecutive capitalized words, stops at lowercase

Also add "result" / "the result" (singular) to section labels for sites using singular headings.

**Consequences:**
- Possessive and helping patterns catch company names before the generic "for" pattern can misfire.
- The "for" pattern no longer captures lowercase action phrases after the company name.
- Sites using "Result" (singular) as a section heading now have results extracted correctly.
- No schema or API changes; purely extractor-internal.
