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

**Decision:** Ollama integration is opt-in, controlled by `AppSettings.ollama_enabled`.
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
